import { create } from "zustand";
import type {
  ShelfStatus,
  InventoryItem,
  ActivityEvent,
  AIRecommendation,
  TaskItem,
  InvenioState,
} from "./types";
import {
  initialShelves,
  initialInventory,
  initialAlerts,
  initialActivities,
  initialRecommendations,
  initialWorkers,
  initialTaskQueue,
  initialManualTask,
} from "./constants";
import {
  getAisleSafePath,
  getRecommendedShelves,
  isShelfAllowedForCategory,
  syncWarehouseState,
} from "./utils";
import { db } from "../db/index";
import { products } from "../db/schema";
import { productToInventoryItem } from "../db/utils";

export const useInvenioStore = create<InvenioState>((set, get) => ({
  theme: "dark",
  activeRoute: "dashboard",
  connections: {
    mqtt: "connected",
    websocket: "connected",
    database: "connected",
    esp32: "connected",
  },
  networkHealth: 99,
  networkLatency: 12,
  latency: 12,
  eventThroughput: [4, 6, 5, 8, 4, 7, 5, 6, 8, 9],

  shelves: initialShelves,
  inventory: initialInventory,

  focusedShelfId: null,
  focusedItemSku: null,
  focusedItemName: null,
  activePath: null,
  pathDistance: null,
  pathETA: null,
  searchQuery: "",

  workers: initialWorkers,
  taskQueue: initialTaskQueue,
  manualTask: initialManualTask,
  manualTaskFeedback: null,
  followingWorkerId: null,
  followWorkerPrompt: null,

  alerts: initialAlerts,
  activities: initialActivities,
  recommendations: initialRecommendations,
  notifications: [],

  setRoute: (route) => set({ activeRoute: route }),
  setFollowingWorkerId: (id) => set({ followingWorkerId: id }),
  setFollowWorkerPrompt: (id) => set({ followWorkerPrompt: id }),

  addNotification: (message, type) =>
    set((state) => ({
      notifications: [
        {
          id: `notif-${Date.now()}-${Math.random()}`,
          message,
          type,
          timestamp: new Date().toTimeString().split(" ")[0],
        },
        ...state.notifications,
      ].slice(0, 5),
    })),

  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  fetchInventory: async () => {
    try {
      const allProducts = await db.select().from(products);
      const inventoryItems = allProducts.map(productToInventoryItem);
      set({ inventory: inventoryItems });
    } catch (e) {
      console.error("Failed to fetch inventory from db", e);
    }
  },

  addInventoryItem: async (item) => {
    try {
      await db.insert(products).values({
        sku: item.sku,
        name: item.name,
        category: item.category,
        zone: item.zone,
        assignedShelf: item.assignedShelf,
        currentShelf: item.currentShelf,
        status: item.status,
        quantity: item.quantity,
      });
      set((state) => ({
        inventory: [item, ...state.inventory],
      }));
    } catch (e) {
      console.error("Failed to insert inventory item into db", e);
    }
  },

  setConnectionStatus: (service, status) =>
    set((state) => ({
      connections: { ...state.connections, [service]: status },
      networkHealth: Math.max(
        10,
        99 -
          (status === "offline" ? 25 : status === "connecting" ? 10 : 0) *
            (service === "esp32" ? 1.5 : 1),
      ),
    })),

  updateThroughput: (val) =>
    set((state) => ({
      eventThroughput: [...state.eventThroughput.slice(1), val],
    })),

  tickTelemetry: () =>
    set((state) => {
      return {
        latency: Math.max(
          5,
          Math.min(80, state.latency + (Math.floor(Math.random() * 4) - 2)),
        ),
        eventThroughput: [
          ...state.eventThroughput.slice(1),
          Math.max(
            2,
            Math.min(
              20,
              state.eventThroughput[9] + (Math.floor(Math.random() * 3) - 1),
            ),
          ),
        ],
      };
    }),


  locateItem: (itemNameOrSku) => {
    const state = get();
    const item = state.inventory.find(
      (i) =>
        i.name.toLowerCase().includes(itemNameOrSku.toLowerCase().trim()) ||
        i.sku.toLowerCase() === itemNameOrSku.toLowerCase().trim(),
    );
    if (!item || !state.shelves[item.currentShelf || item.assignedShelf])
      return false;

    const shelfId = item.currentShelf || item.assignedShelf;
    const path = getAisleSafePath(
      [0, -0.3, 9],
      [
        state.shelves[shelfId].position[0],
        -0.3,
        state.shelves[shelfId].position[2],
      ],
    );

    let dist = 0;
    for (let i = 0; i < path.length - 1; i++)
      dist += Math.sqrt(
        Math.pow(path[i][0] - path[i + 1][0], 2) +
          Math.pow(path[i][1] - path[i + 1][1], 2) +
          Math.pow(path[i][2] - path[i + 1][2], 2),
      );

    set({
      focusedShelfId: shelfId,
      focusedItemSku: item.sku,
      focusedItemName: item.name,
      activePath: path,
      pathDistance: Math.round(dist * 6),
      pathETA: Math.round((dist * 6) / 1.4),
      activeRoute: "twin",
    });
    return true;
  },

  clearActivePath: () =>
    set({
      focusedShelfId: null,
      focusedItemSku: null,
      focusedItemName: null,
      activePath: null,
      pathDistance: null,
      pathETA: null,
    }),

  tickWorker: (delta) =>
    set((state) => {
      // Note: The contents of this massive animation loop are kept fully intact!
      const updatedWorkers = { ...state.workers };
      const updatedTaskQueue = [...state.taskQueue];
      let updatedInventory = [...state.inventory];
      let updatedShelves = { ...state.shelves };
      let updatedAlerts = [...state.alerts];
      let updatedActivities = [...state.activities];

      Object.keys(updatedWorkers).forEach((workerId) => {
        const worker = updatedWorkers[workerId];
        const isManualDemoActive = state.manualTask.workerId !== null;

        if (worker.status === "idle") {
          if (!isManualDemoActive) {
            const nextTask = updatedTaskQueue.find(
              (t) =>
                t.status === "pending" &&
                t.type === "automated" &&
                t.assignedWorkerId === null,
            );
            if (nextTask) {
              nextTask.status = "reserved";
              nextTask.assignedWorkerId = workerId;
              const itemShelf = state.shelves[nextTask.itemShelfId];
              if (itemShelf) {
                worker.status = "moving_to_item";
                worker.currentTaskId = nextTask.id;
                worker.targetShelfId = nextTask.itemShelfId;
                worker.carriedItemName = null;
                worker.path = getAisleSafePath(
                  worker.position,
                  itemShelf.position,
                );
                worker.pathIndex = 0;
                worker.progress = 0;
                worker.label = `Moving to ${nextTask.itemName}`;
              }
            } else {
              worker.label = "Available";
            }
          } else {
            worker.label = "Available";
          }
          return;
        }

        if (workerId === "beta" && updatedWorkers.alpha.status !== "idle") {
          const dist = Math.sqrt(
            Math.pow(updatedWorkers.alpha.position[0] - worker.position[0], 2) +
              Math.pow(
                updatedWorkers.alpha.position[2] - worker.position[2],
                2,
              ),
          );
          if (dist < 2.0) {
            worker.label = "Collision Yield: Waiting...";
            return;
          }
        }

        const isManual =
          isManualDemoActive && state.manualTask.workerId === workerId;
        if (worker.status === "picking_item") {
          if (isManual && state.manualTask.step === "moving_to_item") {
            worker.label = `Ready to Pick ${state.manualTask.itemName}`;
            return;
          }
          worker.progress += delta * 1.2;
          worker.label = `Picking ${worker.carriedItemName || "Cargo"}`;
          if (worker.progress >= 1) {
            worker.progress = 0;
            if (isManual) {
              worker.carriedItemName = state.manualTask.itemName;
              worker.label = `Item Loaded (Ready to Deliver)`;
              set((s) => ({ manualTask: { ...s.manualTask, step: "picked" } }));
            } else {
              const activeTask = updatedTaskQueue.find(
                (t) => t.id === worker.currentTaskId,
              );
              if (activeTask && state.shelves[activeTask.correctShelfId]) {
                worker.carriedItemName = activeTask.itemName;
                worker.status = "moving_to_shelf";
                worker.targetShelfId = activeTask.correctShelfId;
                worker.path = getAisleSafePath(
                  worker.position,
                  state.shelves[activeTask.correctShelfId].position,
                );
                worker.pathIndex = 0;
                worker.label = `Moving ${activeTask.itemName} to ${activeTask.correctShelfId}`;
              }
            }
          }
        } else if (worker.status === "placing_item") {
          if (isManual && state.manualTask.step === "moving_to_shelf") {
            worker.label = `Ready to Place & Verify`;
            return;
          }
          worker.progress += delta * 1.2;
          worker.label = `Verifying placement...`;
          if (worker.progress >= 1) {
            worker.progress = 0;
            worker.carriedItemName = null;
            if (isManual) {
              const item = updatedInventory.find(
                (i) =>
                  i.name.toLowerCase() ===
                  state.manualTask.itemName?.toLowerCase(),
              );
              if (item && state.manualTask.correctShelfId) {
                item.currentShelf = state.manualTask.correctShelfId;
                item.status = "verified";
              }
              const sync = syncWarehouseState({
                shelves: updatedShelves,
                inventory: updatedInventory,
                alerts: updatedAlerts,
              });
              updatedShelves = sync.shelves;
              updatedAlerts = sync.alerts;
              worker.label = `Shelf Verified! Ready to Return`;
              set((s) => ({ manualTask: { ...s.manualTask, step: "placed" } }));
              updatedTaskQueue.forEach((t) => {
                if (
                  t.itemName.toLowerCase() ===
                    state.manualTask.itemName?.toLowerCase() &&
                  t.correctShelfId === state.manualTask.correctShelfId
                )
                  t.status = "completed";
              });
              updatedActivities.unshift({
                id: `act-${Date.now()}`,
                time: new Date().toTimeString().split(" ")[0],
                message: `Shelf verified: ${state.manualTask.correctShelfId}`,
                type: "success",
              });
            } else {
              const activeTask = updatedTaskQueue.find(
                (t) => t.id === worker.currentTaskId,
              );
              if (activeTask) {
                activeTask.status = "completed";
                const item = updatedInventory.find(
                  (i) =>
                    i.name.toLowerCase() === activeTask.itemName.toLowerCase(),
                );
                if (item) {
                  item.currentShelf = activeTask.correctShelfId;
                  item.status = "verified";
                }
                const sync = syncWarehouseState({
                  shelves: updatedShelves,
                  inventory: updatedInventory,
                  alerts: updatedAlerts,
                });
                updatedShelves = sync.shelves;
                updatedAlerts = sync.alerts;
                updatedActivities.unshift({
                  id: `act-${Date.now()}`,
                  time: new Date().toTimeString().split(" ")[0],
                  message: `Shelf verified: ${activeTask.correctShelfId}`,
                  type: "success",
                });
                worker.status = "returning";
                worker.targetShelfId = null;
                worker.path = getAisleSafePath(
                  worker.position,
                  worker.basePosition,
                );
                worker.pathIndex = 0;
                worker.label = `Returning to Base`;
              }
            }
          }
        } else if (
          worker.status === "moving_to_item" ||
          worker.status === "moving_to_shelf" ||
          worker.status === "returning"
        ) {
          if (worker.path && worker.pathIndex < worker.path.length - 1) {
            worker.progress += delta * 1.5;
            const p1 = worker.path[worker.pathIndex];
            const p2 = worker.path[worker.pathIndex + 1];
            worker.position = [
              p1[0] + (p2[0] - p1[0]) * worker.progress,
              p1[1],
              p1[2] + (p2[2] - p1[2]) * worker.progress,
            ];

            worker.label =
              worker.status === "moving_to_item"
                ? `Moving to ${isManual ? state.manualTask.itemName : updatedTaskQueue.find((t) => t.id === worker.currentTaskId)?.itemName || "Item"}`
                : worker.status === "moving_to_shelf"
                  ? `Moving ${isManual ? state.manualTask.itemName : updatedTaskQueue.find((t) => t.id === worker.currentTaskId)?.itemName || "Cargo"} to ${isManual ? state.manualTask.correctShelfId : updatedTaskQueue.find((t) => t.id === worker.currentTaskId)?.correctShelfId}`
                  : `Returning to Base`;

            if (worker.progress >= 1) {
              worker.progress = 0;
              worker.pathIndex += 1;
              if (worker.pathIndex >= worker.path.length - 1) {
                if (worker.status === "moving_to_item") {
                  worker.status = "picking_item";
                  if (isManual)
                    set((s) => ({
                      manualTask: { ...s.manualTask, step: "moving_to_item" },
                    }));
                  else {
                    const t = updatedTaskQueue.find(
                      (t) => t.id === worker.currentTaskId,
                    );
                    if (t && t.assignedWorkerId === workerId)
                      t.status = "active";
                  }
                } else if (worker.status === "moving_to_shelf") {
                  worker.status = "placing_item";
                  if (isManual)
                    set((s) => ({
                      manualTask: { ...s.manualTask, step: "moving_to_shelf" },
                    }));
                } else if (worker.status === "returning") {
                  worker.status = "idle";
                  worker.currentTaskId = null;
                  worker.targetShelfId = null;
                  worker.carriedItemName = null;
                  worker.path = null;
                  worker.pathIndex = 0;
                  worker.progress = 0;
                  worker.label = "Available";
                  if (isManual)
                    set({
                      manualTaskFeedback: {
                        itemName: state.manualTask.itemName || "Cargo",
                        correctShelfId:
                          state.manualTask.correctShelfId || "Shelf",
                        workerId: workerId,
                      },
                      manualTask: {
                        workerId: null,
                        step: "none",
                        itemName: null,
                        itemShelfId: null,
                        correctShelfId: null,
                      },
                    });
                }
              }
            }
          } else {
            worker.status = "idle";
          }
        }
      });

      return {
        workers: updatedWorkers,
        taskQueue: updatedTaskQueue,
        inventory: updatedInventory,
        shelves: updatedShelves,
        alerts: updatedAlerts,
        activities: updatedActivities.slice(0, 50),
      };
    }),

  assignWorkerTask: (itemName, itemShelf, correctShelf) =>
    get().addTaskToQueue(itemName, itemShelf, correctShelf, "automated"),

  addTaskToQueue: (itemName, itemShelfId, correctShelfId, type = "automated") =>
    set((state) => ({
      taskQueue: [
        ...state.taskQueue,
        {
          id: `task-${Date.now()}`,
          itemName,
          itemShelfId,
          correctShelfId,
          status: "pending",
          assignedWorkerId: null,
          type,
        },
      ],
      activities: [
        {
          id: `act-${Date.now()}`,
          time: new Date().toTimeString().split(" ")[0],
          message: `Task added: Move ${itemName} to ${correctShelfId}`,
          type: "info",
        },
        ...state.activities.slice(0, 49),
      ],
    })),

  // Manual actions logic kept intact...
  assignManualWorker: (workerId, itemName, itemShelfId, correctShelfId) =>
    set((state) => {
      const updatedWorkers = {
        ...state.workers,
        [workerId]: {
          ...state.workers[workerId],
          status: "idle",
          progress: 0,
          carriedItemName: null,
          path: null,
          pathIndex: 0,
          label: `Assigned: ${itemName}`,
          targetShelfId: itemShelfId,
        } as unknown as import("./types").WorkerState,
      };
      return {
        workers: updatedWorkers,
        manualTask: {
          workerId,
          step: "assigned",
          itemName,
          itemShelfId,
          correctShelfId,
        },
        taskQueue: [
          ...state.taskQueue,
          {
            id: `task-manual-${Date.now()}`,
            itemName,
            itemShelfId,
            correctShelfId,
            status: "active",
            assignedWorkerId: workerId,
            type: "manual",
          },
        ],
        activities: [
          {
            id: `act-${Date.now()}`,
            time: new Date().toTimeString().split(" ")[0],
            message: `Manual override: ${workerId.toUpperCase()} Forklift assigned`,
            type: "info",
          },
          ...state.activities.slice(0, 49),
        ],
      };
    }),

  moveManualWorkerToItem: (workerId) =>
    set((state) => ({
      workers: {
        ...state.workers,
        [workerId]: {
          ...state.workers[workerId],
          status: "moving_to_item",
          path: getAisleSafePath(
            state.workers[workerId].position,
            state.shelves[state.manualTask.itemShelfId!].position,
          ),
          pathIndex: 0,
          progress: 0,
          label: `Moving to ${state.manualTask.itemName}`,
        },
      },
      manualTask: { ...state.manualTask, step: "assigned" },
      followWorkerPrompt: workerId,
    })),
  pickManualItem: (workerId) =>
    set((state) => ({
      workers: {
        ...state.workers,
        [workerId]: {
          ...state.workers[workerId],
          status: "picking_item",
          progress: 0,
          label: `Picking ${state.manualTask.itemName}`,
        },
      },
      manualTask: { ...state.manualTask, step: "picking" },
    })),
  deliverManualItem: (workerId) =>
    set((state) => ({
      workers: {
        ...state.workers,
        [workerId]: {
          ...state.workers[workerId],
          status: "moving_to_shelf",
          path: getAisleSafePath(
            state.workers[workerId].position,
            state.shelves[state.manualTask.correctShelfId!].position,
          ),
          pathIndex: 0,
          progress: 0,
          label: `Moving ${state.manualTask.itemName} to ${state.manualTask.correctShelfId}`,
          targetShelfId: state.manualTask.correctShelfId,
        },
      },
      manualTask: { ...state.manualTask, step: "picked" },
      followWorkerPrompt: workerId,
    })),
  placeManualItem: (workerId) =>
    set((state) => ({
      workers: {
        ...state.workers,
        [workerId]: {
          ...state.workers[workerId],
          status: "placing_item",
          progress: 0,
          label: `Verifying shelf ${state.manualTask.correctShelfId}`,
        },
      },
      manualTask: { ...state.manualTask, step: "placing" },
    })),
  sendManualWorkerToBase: (workerId) =>
    set((state) => ({
      workers: {
        ...state.workers,
        [workerId]: {
          ...state.workers[workerId],
          status: "returning",
          path: getAisleSafePath(
            state.workers[workerId].position,
            state.workers[workerId].basePosition,
          ),
          pathIndex: 0,
          progress: 0,
          label: `Returning to Base`,
        },
      },
      manualTask: { ...state.manualTask, step: "placed" },
      followWorkerPrompt: workerId,
    })),
  cancelManualTask: (workerId) =>
    set((state) => ({
      workers: {
        ...state.workers,
        [workerId]: {
          ...state.workers[workerId],
          status: "returning",
          path: getAisleSafePath(
            state.workers[workerId].position,
            state.workers[workerId].basePosition,
          ),
          pathIndex: 0,
          progress: 0,
          label: `Task cancelled: Returning to Base`,
        },
      },
      manualTask: {
        workerId: null,
        step: "none",
        itemName: null,
        itemShelfId: null,
        correctShelfId: null,
      },
    })),
  clearManualTaskFeedback: () => set({ manualTaskFeedback: null }),

  assignWorkerToFixAlert: (alertId, targetShelfId, preferredWorkerId = "best") =>
    set((state) => {
      const alert = state.alerts.find((a) => a.id === alertId);
      if (!alert) return {};
      const item = state.inventory.find(
        (i) =>
          (i.currentShelf === alert.shelfId ||
            i.assignedShelf === alert.shelfId) &&
          (i.currentShelf !== i.assignedShelf ||
            !isShelfAllowedForCategory(
              i.category,
              i.currentShelf,
              state.shelves,
            )),
      );
      if (!item) return {};

      item.assignedShelf = targetShelfId;
      let assignedWorkerId: "alpha" | "beta" | null =
        preferredWorkerId === "alpha" && state.workers.alpha.status === "idle"
          ? "alpha"
          : preferredWorkerId === "beta" && state.workers.beta.status === "idle"
            ? "beta"
            : state.workers.alpha.status === "idle"
              ? "alpha"
              : state.workers.beta.status === "idle"
                ? "beta"
                : "alpha";

      const updatedWorkers = { ...state.workers };
      if (updatedWorkers[assignedWorkerId]) {
        updatedWorkers[assignedWorkerId] = {
          ...updatedWorkers[assignedWorkerId],
          status: "moving_to_item",
          currentTaskId: `task-fix-${Date.now()}`,
          targetShelfId: item.currentShelf,
          carriedItemName: null,
          path: getAisleSafePath(
            updatedWorkers[assignedWorkerId].position,
            state.shelves[item.currentShelf]?.position || [0, -0.3, 9],
          ),
          pathIndex: 0,
          progress: 0,
          label: `Moving to ${item.name}`,
        };
      }
      return {
        workers: updatedWorkers,
        taskQueue: [
          ...state.taskQueue,
          {
            id: `task-fix-${Date.now()}`,
            itemName: item.name,
            itemShelfId: item.currentShelf,
            correctShelfId: targetShelfId,
            status: "reserved",
            assignedWorkerId,
            type: "automated",
          },
        ],
        alerts: state.alerts.map((a) =>
          a.id === alertId ? { ...a, resolved: true } : a,
        ),
        activities: [
          {
            id: `act-${Date.now()}`,
            time: new Date().toTimeString().split(" ")[0],
            message: `Fix assigned: dispatches ${assignedWorkerId.toUpperCase()} to move ${item.name} to ${targetShelfId}`,
            type: "success",
          },
          ...state.activities.slice(0, 49),
        ],
        notifications: [
          {
            id: `notif-${Date.now()}`,
            message: `Fix Dispatch: ${assignedWorkerId.toUpperCase()} moving ${item.name} to ${targetShelfId}.`,
            type: "success" as const,
            timestamp: new Date().toTimeString().split(" ")[0],
          } as const,
          ...state.notifications,
        ].slice(0, 5),
        followWorkerPrompt: assignedWorkerId,
      };
    }),

  dispatchWorkerToTask: (taskId, preferredWorkerId) =>
    set((state) => {
      const taskIndex = state.taskQueue.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return {};
      const task = state.taskQueue[taskIndex];
      let assignedWorkerId: "alpha" | "beta" =
        preferredWorkerId === "alpha" && state.workers.alpha.status === "idle"
          ? "alpha"
          : preferredWorkerId === "beta" && state.workers.beta.status === "idle"
            ? "beta"
            : state.workers.alpha.status === "idle"
              ? "alpha"
              : state.workers.beta.status === "idle"
                ? "beta"
                : "alpha";
      const updatedTaskQueue = [...state.taskQueue];
      updatedTaskQueue[taskIndex] = {
        ...task,
        status: "reserved",
        assignedWorkerId,
      };
      const updatedWorkers = { ...state.workers };
      if (updatedWorkers[assignedWorkerId]) {
        updatedWorkers[assignedWorkerId] = {
          ...updatedWorkers[assignedWorkerId],
          status: "moving_to_item",
          currentTaskId: taskId,
          targetShelfId: task.itemShelfId,
          carriedItemName: null,
          path: getAisleSafePath(
            updatedWorkers[assignedWorkerId].position,
            state.shelves[task.itemShelfId]?.position || [0, -0.3, 9],
          ),
          pathIndex: 0,
          progress: 0,
          label: `Moving to ${task.itemName}`,
        };
      }
      return {
        taskQueue: updatedTaskQueue,
        workers: updatedWorkers,
        activities: [
          {
            id: `act-${Date.now()}`,
            time: new Date().toTimeString().split(" ")[0],
            message: `Manual Dispatch: ${assignedWorkerId.toUpperCase()} moving ${task.itemName} from ${task.itemShelfId} to ${task.correctShelfId}`,
            type: "success" as const,
          },
          ...state.activities.slice(0, 49),
        ],
        notifications: [
          {
            id: `notif-${Date.now()}`,
            message: `Manual Dispatch: Dispatched ${assignedWorkerId.toUpperCase()} to relocate ${task.itemName}.`,
            type: "success" as const,
            timestamp: new Date().toTimeString().split(" ")[0],
          },
          ...state.notifications,
        ].slice(0, 5),
        followWorkerPrompt: assignedWorkerId,
      };
    }),

  cancelTask: (taskId) =>
    set((state) => {
      const task = state.taskQueue.find((t) => t.id === taskId);
      if (!task) return {};
      const updatedWorkers = { ...state.workers };
      if (task.assignedWorkerId && updatedWorkers[task.assignedWorkerId]) {
        updatedWorkers[task.assignedWorkerId] = {
          ...updatedWorkers[task.assignedWorkerId],
          status: "idle" as "idle",
          currentTaskId: null,
          targetShelfId: null,
          carriedItemName: null,
          path: null,
          label: "Available",
        };
      }
      return {
        taskQueue: state.taskQueue.filter((t) => t.id !== taskId),
        workers: updatedWorkers,
        activities: [
          {
            id: `act-${Date.now()}`,
            time: new Date().toTimeString().split(" ")[0],
            message: `Task Canceled: Move ${task.itemName} to ${task.correctShelfId}`,
            type: "warning" as const,
          },
          ...state.activities.slice(0, 49),
        ],
        notifications: [
          {
            id: `notif-${Date.now()}`,
            message: `Task Canceled: Relocation of ${task.itemName} canceled.`,
            type: "warning" as const,
            timestamp: new Date().toTimeString().split(" ")[0],
          },
          ...state.notifications,
        ].slice(0, 5),
      };
    }),

  addInventoryAI: (name, qty, category?, zone?, shelf?) => {
    let responseMessage = "";
    set((state) => {
      const existingIndex = state.inventory.findIndex(
        (i) => i.name.toLowerCase() === name.toLowerCase(),
      );
      if (existingIndex >= 0) {
        const newQty = state.inventory[existingIndex].quantity + qty;
        responseMessage = `Added ${qty} ${name} to ${state.inventory[existingIndex].assignedShelf}. Total: ${newQty}.`;
        return {
          inventory: state.inventory.map((item, i) =>
            i === existingIndex ? { ...item, quantity: newQty } : item,
          ),
          activities: [
            {
              id: `act-${Date.now()}`,
              time: new Date().toTimeString().split(" ")[0],
              message: `Inventory added: ${name} (${qty} units)`,
              type: "success",
            },
            ...state.activities.slice(0, 49),
          ],
        };
      } else {
        responseMessage = `Added ${qty} ${name} to ${shelf || "A3"}.`;
        return {
          inventory: [
            {
              sku: `SKU-A${Math.floor(100 + Math.random() * 899)}`,
              name,
              category: category || "General",
              zone: zone || "Zone A",
              assignedShelf: shelf || "A3",
              currentShelf: shelf || "A3",
              status: "verified",
              quantity: qty,
            },
            ...state.inventory,
          ],
          activities: [
            {
              id: `act-${Date.now()}`,
              time: new Date().toTimeString().split(" ")[0],
              message: `Inventory added: ${name} (${qty} units)`,
              type: "success",
            },
            ...state.activities.slice(0, 49),
          ],
        };
      }
    });
    return responseMessage;
  },

  updateInventoryAI: (name, qty) => {
    let responseMessage = "";
    set((state) => {
      const idx = state.inventory.findIndex((i) =>
        i.name.toLowerCase().includes(name.toLowerCase()),
      );
      if (idx === -1) {
        responseMessage = `Item ${name} not found in inventory registry.`;
        return {};
      }
      responseMessage = `Set quantity of ${state.inventory[idx].name} to ${qty}.`;
      return {
        inventory: state.inventory.map((item, i) =>
          i === idx ? { ...item, quantity: qty } : item,
        ),
        activities: [
          {
            id: `act-${Date.now()}`,
            time: new Date().toTimeString().split(" ")[0],
            message: `Stock level updated: ${state.inventory[idx].name} set to ${qty}`,
            type: "success",
          },
          ...state.activities.slice(0, 49),
        ],
      };
    });
    return responseMessage;
  },

  removeInventoryAI: (name, qty) => {
    let responseMessage = "";
    set((state) => {
      const idx = state.inventory.findIndex((i) =>
        i.name.toLowerCase().includes(name.toLowerCase()),
      );
      if (idx === -1) {
        responseMessage = `Item ${name} not found in inventory registry.`;
        return {};
      }
      const newQty = Math.max(0, state.inventory[idx].quantity - qty);
      responseMessage = `Removed ${qty} ${state.inventory[idx].name}. New quantity is ${newQty}.`;
      return {
        inventory: state.inventory.map((item, i) =>
          i === idx ? { ...item, quantity: newQty } : item,
        ),
        activities: [
          {
            id: `act-${Date.now()}`,
            time: new Date().toTimeString().split(" ")[0],
            message: `Stock level reduced: ${state.inventory[idx].name} (${qty} units removed)`,
            type: "warning",
          },
          ...state.activities.slice(0, 49),
        ],
      };
    });
    return responseMessage;
  },

  getInventorySummary: () => {
    const state = get();
    return {
      total: state.inventory.reduce((acc, curr) => acc + curr.quantity, 0),
      categories: state.inventory.reduce((acc: any, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.quantity;
        return acc;
      }, {}),
      itemsCount: state.inventory.length,
    };
  },

  getMisplacedItems: () =>
    get().inventory.filter(
      (item) =>
        item.status === "error" || item.assignedShelf !== item.currentShelf,
    ),

  resolveAlert: (alertId) =>
    set((state) => {
      const alert = state.alerts.find((a) => a.id === alertId);
      if (!alert) return {};
      let updatedShelves = { ...state.shelves };
      let updatedInventory = [...state.inventory];
      if (alert.shelfId && state.shelves[alert.shelfId]) {
        updatedShelves[alert.shelfId] = {
          ...state.shelves[alert.shelfId],
          status: "verified",
        };
        updatedInventory = state.inventory.map((item) =>
          item.assignedShelf === alert.shelfId
            ? { ...item, status: "verified", currentShelf: alert.shelfId }
            : item,
        );
      }
      return {
        alerts: state.alerts
          .map((a) => (a.id === alertId ? { ...a, resolved: true } : a))
          .filter((a) => !a.resolved),
        shelves: updatedShelves,
        inventory: updatedInventory,
        activities: [
          {
            id: `act-${Date.now()}`,
            time: new Date().toTimeString().split(" ")[0],
            message: `Shelf verified: ${alert.shelfId || "System"}`,
            type: "success",
          },
          ...state.activities.slice(0, 49),
        ],
      };
    }),

  addCustomAlert: (severity, message, shelfId) =>
    set((state) => ({
      alerts: [
        {
          id: `alert-${Date.now()}`,
          timestamp: new Date().toTimeString().split(" ")[0],
          severity,
          message,
          resolved: false,
          shelfId,
        },
        ...state.alerts,
      ],
      activities: [
        {
          id: `act-${Date.now()}`,
          time: new Date().toTimeString().split(" ")[0],
          message: `${severity === "critical" ? "Item misplaced" : "Verification pending"}`,
          type: severity === "critical" ? "error" : "warning",
        },
        ...state.activities.slice(0, 49),
      ],
    })),
}));
