import type {
  Shelf,
  InventoryItem,
  AlertLog,
  ActivityEvent,
  AIRecommendation,
  WorkerState,
  TaskItem,
  ManualTaskState,
} from "./types";
import { seedDataToInventoryItems } from "../db/utils.ts";

export const initialShelves: Record<string, Shelf> = {
  A1: {
    id: "A1",
    name: "Shelf A1",
    zone: "Zone A",
    status: "verified",
    assignedSKUs: ["SKU-E01", "SKU-E02", "SKU-E03"],
    position: [-4, 1, -2],
  },
  A2: {
    id: "A2",
    name: "Shelf A2",
    zone: "Zone A",
    status: "verified",
    assignedSKUs: ["SKU-E04", "SKU-E05", "SKU-E06"],
    position: [-4, 1, 0],
  },
  A3: {
    id: "A3",
    name: "Shelf A3",
    zone: "Zone A",
    status: "verified",
    assignedSKUs: ["SKU-E07", "SKU-E08", "SKU-E09"],
    position: [-4, 1, 2],
  },
  B1: {
    id: "B1",
    name: "Shelf B1",
    zone: "Zone B",
    status: "verified",
    assignedSKUs: ["SKU-F01", "SKU-F02", "SKU-F03"],
    position: [0, 1, -2],
  },
  B2: {
    id: "B2",
    name: "Shelf B2",
    zone: "Zone B",
    status: "verified",
    assignedSKUs: [],
    position: [0, 1, 0],
  },
  B3: {
    id: "B3",
    name: "Shelf B3",
    zone: "Zone B",
    status: "verified",
    assignedSKUs: [],
    position: [0, 1, 2],
  },
  C1: {
    id: "C1",
    name: "Shelf C1",
    zone: "Zone C",
    status: "verified",
    assignedSKUs: ["SKU-B01", "SKU-B02", "SKU-B03"],
    position: [4, 1, -2],
  },
  C2: {
    id: "C2",
    name: "Shelf C2",
    zone: "Zone C",
    status: "verified",
    assignedSKUs: ["SKU-B04", "SKU-B05", "SKU-B06"],
    position: [4, 1, 0],
  },
  C3: {
    id: "C3",
    name: "Shelf C3",
    zone: "Zone C",
    status: "verified",
    assignedSKUs: [],
    position: [4, 1, 2],
  },
  H1: {
    id: "H1",
    name: "Shelf H1",
    zone: "Hazard Storage",
    status: "verified",
    assignedSKUs: ["SKU-H01", "SKU-H03"],
    position: [-8, 1, -4],
  },
  H2: {
    id: "H2",
    name: "Shelf H2",
    zone: "Hazard Storage",
    status: "error",
    assignedSKUs: ["SKU-H02"],
    position: [-8, 1, 4],
  },
  F1: {
    id: "F1",
    name: "Shelf F1",
    zone: "Cold Storage",
    status: "verified",
    assignedSKUs: [],
    position: [8, 1, -4],
  },
  F2: {
    id: "F2",
    name: "Shelf F2",
    zone: "Cold Storage",
    status: "pending",
    assignedSKUs: [],
    position: [8, 1, 4],
  },
  REC: {
    id: "REC",
    name: "Receiving Area",
    zone: "Receiving Area",
    status: "pending",
    assignedSKUs: [],
    position: [0, -0.3, 9],
  },
};

export const initialInventory: InventoryItem[] = seedDataToInventoryItems();

export const initialAlerts: AlertLog[] = [
  {
    id: "alert-1",
    timestamp: "14:20:10",
    severity: "critical",
    message:
      "Batteries misplaced on shelf H1 instead of assigned H2. Expected: Hazard Storage. Status: Misplaced",
    resolved: false,
    shelfId: "H1",
  },
];

export const initialActivities: ActivityEvent[] = [
  {
    id: "act-1",
    time: "14:15:32",
    message: "Shelf verified: A1.",
    type: "success",
  },
  {
    id: "act-2",
    time: "14:18:12",
    message: "Telemetry reader online.",
    type: "success",
  },
  {
    id: "act-3",
    time: "14:20:10",
    message: "Item misplaced: Batteries on H1.",
    type: "error",
  },
  {
    id: "act-4",
    time: "14:25:02",
    message: "Shelf needs verification: F2.",
    type: "warning",
  },
];

export const initialRecommendations: AIRecommendation[] = [
  {
    id: "rec-1",
    title: "Relocate Fast-Moving Items",
    description:
      "M3 Bolts have high pick volume. Shift closer to Dispatch Area to reduce picker walking times.",
    impact: "18% efficiency increase",
    type: "layout",
    active: true,
  },
  {
    id: "rec-2",
    title: "Isolate High Temperature Battery Cell",
    description:
      "Batteries are currently near paint solvents. Relocate H2 contents to climate-controlled Cold Box.",
    impact: "Safety risk averted",
    type: "safety",
    active: true,
  },
];

export const initialWorkers: Record<string, WorkerState> = {
  alpha: {
    id: "alpha",
    name: "Alpha Forklift",
    status: "idle",
    position: [-6, -0.3, 9],
    basePosition: [-6, -0.3, 9],
    targetShelfId: null,
    currentTaskId: null,
    progress: 0,
    label: "Worker Idle",
    path: null,
    pathIndex: 0,
    carriedItemName: null,
    color: "#FF6B35",
  },
  beta: {
    id: "beta",
    name: "Beta Forklift",
    status: "idle",
    position: [6, -0.3, 9],
    basePosition: [6, -0.3, 9],
    targetShelfId: null,
    currentTaskId: null,
    progress: 0,
    label: "Worker Idle",
    path: null,
    pathIndex: 0,
    carriedItemName: null,
    color: "#5A5D64",
  },
};

export const initialTaskQueue: TaskItem[] = [
  {
    id: "task-1",
    itemName: "Batteries",
    itemShelfId: "H1",
    correctShelfId: "H2",
    status: "pending",
    assignedWorkerId: null,
    type: "automated",
  },
];

export const initialManualTask: ManualTaskState = {
  workerId: null,
  step: "none",
  itemName: null,
  itemShelfId: null,
  correctShelfId: null,
};
