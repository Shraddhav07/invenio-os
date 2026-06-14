export type PageRoute =
  | "dashboard"
  | "twin"
  | "inventory"
  | "assistant"
  | "analytics"
  | "alerts"
  | "settings"
  | "camfeeds";

export type ShelfStatus = "verified" | "pending" | "error";

export interface Shelf {
  id: string;
  name: string;
  zone: string;
  status: ShelfStatus;
  assignedSKUs: string[];
  position: [number, number, number];
}

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  zone: string;
  assignedShelf: string;
  currentShelf: string;
  status: ShelfStatus;
  quantity: number;
}

export interface AlertLog {
  id: string;
  timestamp: string;
  severity: "info" | "warning" | "critical";
  message: string;
  resolved: boolean;
  shelfId?: string;
}

export interface ActivityEvent {
  id: string;
  time: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
}

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  impact: string;
  type: "layout" | "safety" | "efficiency";
  active: boolean;
}

export interface WorkerState {
  id: string;
  name: string;
  status:
    | "idle"
    | "moving_to_item"
    | "picking_item"
    | "moving_to_shelf"
    | "placing_item"
    | "returning";
  position: [number, number, number];
  basePosition: [number, number, number];
  targetShelfId: string | null;
  currentTaskId: string | null;
  progress: number;
  label: string;
  path: [number, number, number][] | null;
  pathIndex: number;
  carriedItemName: string | null;
  color: string;
}

export interface TaskItem {
  id: string;
  itemName: string;
  itemShelfId: string;
  correctShelfId: string;
  status: "pending" | "reserved" | "active" | "completed";
  assignedWorkerId: string | null;
  type: "automated" | "manual";
}

export interface ManualTaskState {
  workerId: "alpha" | "beta" | null;
  step:
    | "none"
    | "assigned"
    | "moving_to_item"
    | "picking"
    | "picked"
    | "moving_to_shelf"
    | "placing"
    | "placed"
    | "completed";
  itemName: string | null;
  itemShelfId: string | null;
  correctShelfId: string | null;
}

export interface InvenioState {
  theme: "dark";
  activeRoute: PageRoute;
  connections: {
    mqtt: "connected" | "offline" | "connecting";
    websocket: "connected" | "offline" | "connecting";
    database: "connected" | "offline" | "connecting";
    esp32: "connected" | "offline" | "connecting";
  };
  networkHealth: number;
  latency: number;
  eventThroughput: number[];

  shelves: Record<string, Shelf>;
  inventory: InventoryItem[];

  focusedShelfId: string | null;
  focusedItemSku: string | null;
  focusedItemName: string | null;
  activePath: [number, number, number][] | null;
  pathDistance: number | null;
  pathETA: number | null;
  searchQuery: string;

  workers: Record<string, WorkerState>;
  taskQueue: TaskItem[];
  manualTask: ManualTaskState;
  manualTaskFeedback: {
    itemName: string;
    correctShelfId: string;
    workerId: string;
  } | null;
  followingWorkerId: "alpha" | "beta" | null;
  followWorkerPrompt: "alpha" | "beta" | null;

  alerts: AlertLog[];
  activities: ActivityEvent[];
  recommendations: AIRecommendation[];
  notifications: {
    id: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    timestamp: string;
  }[];

  isLiveSyncEnabled: boolean;
  pendingDbUpdates: any[];
  wsInstance: WebSocket | null;
  toggleLiveSync: () => void;
  pushUpdates: () => Promise<void>;
  initWebSocket: () => void;
  cleanupWebSocket: () => void;

  setRoute: (route: PageRoute) => void;
  setConnectionStatus: (
    service: "mqtt" | "websocket" | "database" | "esp32",
    status: "connected" | "offline" | "connecting",
  ) => void;
  setFollowingWorkerId: (id: "alpha" | "beta" | null) => void;
  setFollowWorkerPrompt: (id: "alpha" | "beta" | null) => void;

  updateThroughput: (val: number) => void;
  tickTelemetry: () => void;
  addNotification: (
    message: string,
    type: "info" | "success" | "warning" | "error",
  ) => void;
  dismissNotification: (id: string) => void;

  locateItem: (itemNameOrSku: string) => boolean;
  clearActivePath: () => void;

  tickWorker: (delta: number) => void;
  assignWorkerTask: (
    itemName: string,
    itemShelf: string,
    correctShelf: string,
  ) => void;
  addTaskToQueue: (
    itemName: string,
    itemShelfId: string,
    correctShelfId: string,
    type?: "automated" | "manual",
  ) => void;

  assignManualWorker: (
    workerId: "alpha" | "beta",
    itemName: string,
    itemShelfId: string,
    correctShelfId: string,
  ) => void;
  moveManualWorkerToItem: (workerId: "alpha" | "beta") => void;
  pickManualItem: (workerId: "alpha" | "beta") => void;
  deliverManualItem: (workerId: "alpha" | "beta") => void;
  placeManualItem: (workerId: "alpha" | "beta") => void;
  sendManualWorkerToBase: (workerId: "alpha" | "beta") => void;
  cancelManualTask: (workerId: "alpha" | "beta") => void;
  clearManualTaskFeedback: () => void;
  assignWorkerToFixAlert: (
    alertId: string,
    targetShelfId: string,
    preferredWorkerId?: "alpha" | "beta" | "best",
  ) => void;
  dispatchWorkerToTask: (
    taskId: string,
    preferredWorkerId?: "alpha" | "beta",
  ) => void;
  cancelTask: (taskId: string) => void;

  addInventoryAI: (
    name: string,
    qty: number,
    category?: string,
    zone?: string,
    shelf?: string,
  ) => string;
  updateInventoryAI: (name: string, qty: number) => string;
  removeInventoryAI: (name: string, qty: number) => string;
  getInventorySummary: () => {
    total: number;
    categories: Record<string, number>;
    itemsCount: number;
  };
  getMisplacedItems: () => InventoryItem[];

  resolveAlert: (alertId: string) => void;
  addCustomAlert: (
    severity: "info" | "warning" | "critical",
    message: string,
    shelfId?: string,
  ) => void;


  addInventoryItem: (item: InventoryItem) => Promise<void>;
}
