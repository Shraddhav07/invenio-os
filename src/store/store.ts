import { create } from 'zustand'

export type PageRoute = 
  | 'dashboard'
  | 'twin'
  | 'inventory'
  | 'assistant'
  | 'analytics'
  | 'alerts'
  | 'simulator'
  | 'settings'

export type ShelfStatus = 'verified' | 'pending' | 'error'

export interface Shelf {
  id: string
  name: string
  zone: string
  status: ShelfStatus
  assignedSKUs: string[]
  position: [number, number, number] // X, Y, Z coordinates in 3D
}

export interface InventoryItem {
  sku: string
  name: string
  category: string
  zone: string
  assignedShelf: string
  currentShelf: string
  status: ShelfStatus
  quantity: number
}

export interface AlertLog {
  id: string
  timestamp: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  resolved: boolean
  shelfId?: string
}

export interface ActivityEvent {
  id: string
  time: string
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
}

export interface AIRecommendation {
  id: string
  title: string
  description: string
  impact: string
  type: 'layout' | 'safety' | 'efficiency'
  active: boolean
}

export interface WorkerState {
  id: string
  name: string
  status: 'idle' | 'moving_to_item' | 'picking_item' | 'moving_to_shelf' | 'placing_item' | 'returning'
  position: [number, number, number]
  basePosition: [number, number, number]
  targetShelfId: string | null
  currentTaskId: string | null
  progress: number
  label: string
  path: [number, number, number][] | null
  pathIndex: number
  carriedItemName: string | null
  color: string
}

export interface TaskItem {
  id: string
  itemName: string
  itemShelfId: string
  correctShelfId: string
  status: 'pending' | 'reserved' | 'active' | 'completed'
  assignedWorkerId: string | null
  type: 'automated' | 'manual'
}

export interface ManualTaskState {
  workerId: 'alpha' | 'beta' | null
  step: 'none' | 'assigned' | 'moving_to_item' | 'picking' | 'picked' | 'moving_to_shelf' | 'placing' | 'placed' | 'completed'
  itemName: string | null
  itemShelfId: string | null
  correctShelfId: string | null
}

export interface InvenioState {
  theme: 'dark'
  activeRoute: PageRoute
  demoMode: boolean
  
  connections: {
    mqtt: 'connected' | 'offline' | 'connecting'
    websocket: 'connected' | 'offline' | 'connecting'
    database: 'connected' | 'offline' | 'connecting'
    esp32: 'connected' | 'offline' | 'connecting'
  }
  networkHealth: number 
  latency: number 
  eventThroughput: number[] 

  shelves: Record<string, Shelf>
  inventory: InventoryItem[]
  
  focusedShelfId: string | null
  focusedItemSku: string | null
  focusedItemName: string | null
  activePath: [number, number, number][] | null 
  pathDistance: number | null 
  pathETA: number | null 
  searchQuery: string
  
  workers: Record<string, WorkerState>
  taskQueue: TaskItem[]
  manualTask: ManualTaskState
  manualTaskFeedback: { itemName: string; correctShelfId: string; workerId: string } | null
  followingWorkerId: 'alpha' | 'beta' | null
  followWorkerPrompt: 'alpha' | 'beta' | null
  
  alerts: AlertLog[]
  activities: ActivityEvent[]
  recommendations: AIRecommendation[]
  notifications: { id: string; message: string; type: 'info' | 'success' | 'warning' | 'error'; timestamp: string }[]

  setRoute: (route: PageRoute) => void
  setDemoMode: (enabled: boolean) => void
  setConnectionStatus: (service: 'mqtt' | 'websocket' | 'database' | 'esp32', status: 'connected' | 'offline' | 'connecting') => void
  setFollowingWorkerId: (id: 'alpha' | 'beta' | null) => void
  setFollowWorkerPrompt: (id: 'alpha' | 'beta' | null) => void
  
  updateThroughput: (val: number) => void
  tickTelemetry: () => void
  addNotification: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void
  dismissNotification: (id: string) => void

  simulatePlacement: (shelfId: string, isCorrect: boolean) => void
  simulateTimeout: (shelfId: string) => void
  simulateDeviceStatus: (online: boolean) => void
  simulateNewArrival: () => void
  simulateAIRecommendation: () => void

  locateItem: (itemNameOrSku: string) => boolean
  clearActivePath: () => void
  
  tickWorker: (delta: number) => void
  assignWorkerTask: (itemName: string, itemShelf: string, correctShelf: string) => void
  addTaskToQueue: (itemName: string, itemShelfId: string, correctShelfId: string, type?: 'automated' | 'manual') => void
  
  assignManualWorker: (workerId: 'alpha' | 'beta', itemName: string, itemShelfId: string, correctShelfId: string) => void
  moveManualWorkerToItem: (workerId: 'alpha' | 'beta') => void
  pickManualItem: (workerId: 'alpha' | 'beta') => void
  deliverManualItem: (workerId: 'alpha' | 'beta') => void
  placeManualItem: (workerId: 'alpha' | 'beta') => void
  sendManualWorkerToBase: (workerId: 'alpha' | 'beta') => void
  cancelManualTask: (workerId: 'alpha' | 'beta') => void
  clearManualTaskFeedback: () => void
  assignWorkerToFixAlert: (alertId: string, preferredWorkerId?: 'alpha' | 'beta' | 'best') => void
  dispatchWorkerToTask: (taskId: string, preferredWorkerId?: 'alpha' | 'beta') => void
  cancelTask: (taskId: string) => void
  
  addInventoryAI: (name: string, qty: number, category?: string, zone?: string, shelf?: string) => string
  updateInventoryAI: (name: string, qty: number) => string
  removeInventoryAI: (name: string, qty: number) => string
  getInventorySummary: () => { total: number; categories: Record<string, number>; itemsCount: number }
  getMisplacedItems: () => InventoryItem[]
  
  resolveAlert: (alertId: string) => void
  addCustomAlert: (severity: 'info' | 'warning' | 'critical', message: string, shelfId?: string) => void
}

const initialShelves: Record<string, Shelf> = {
  'A1': { id: 'A1', name: 'Shelf A1', zone: 'Zone A', status: 'verified', assignedSKUs: ['SKU-E01', 'SKU-E02', 'SKU-E03'], position: [-4, 1, -2] },
  'A2': { id: 'A2', name: 'Shelf A2', zone: 'Zone A', status: 'verified', assignedSKUs: ['SKU-E04', 'SKU-E05', 'SKU-E06'], position: [-4, 1, 0] },
  'A3': { id: 'A3', name: 'Shelf A3', zone: 'Zone A', status: 'verified', assignedSKUs: ['SKU-E07', 'SKU-E08', 'SKU-E09'], position: [-4, 1, 2] },
  'B1': { id: 'B1', name: 'Shelf B1', zone: 'Zone B', status: 'verified', assignedSKUs: ['SKU-F01', 'SKU-F02', 'SKU-F03'], position: [0, 1, -2] },
  'B2': { id: 'B2', name: 'Shelf B2', zone: 'Zone B', status: 'verified', assignedSKUs: [], position: [0, 1, 0] },
  'B3': { id: 'B3', name: 'Shelf B3', zone: 'Zone B', status: 'verified', assignedSKUs: [], position: [0, 1, 2] },
  'C1': { id: 'C1', name: 'Shelf C1', zone: 'Zone C', status: 'verified', assignedSKUs: ['SKU-B01', 'SKU-B02', 'SKU-B03'], position: [4, 1, -2] },
  'C2': { id: 'C2', name: 'Shelf C2', zone: 'Zone C', status: 'verified', assignedSKUs: ['SKU-B04', 'SKU-B05', 'SKU-B06'], position: [4, 1, 0] },
  'C3': { id: 'C3', name: 'Shelf C3', zone: 'Zone C', status: 'verified', assignedSKUs: [], position: [4, 1, 2] },
  'H1': { id: 'H1', name: 'Shelf H1', zone: 'Hazard Storage', status: 'verified', assignedSKUs: ['SKU-H01', 'SKU-H03'], position: [-8, 1, -4] },
  'H2': { id: 'H2', name: 'Shelf H2', zone: 'Hazard Storage', status: 'error', assignedSKUs: ['SKU-H02'], position: [-8, 1, 4] },
  'F1': { id: 'F1', name: 'Shelf F1', zone: 'Cold Storage', status: 'verified', assignedSKUs: [], position: [8, 1, -4] },
  'F2': { id: 'F2', name: 'Shelf F2', zone: 'Cold Storage', status: 'pending', assignedSKUs: [], position: [8, 1, 4] },
  'REC': { id: 'REC', name: 'Receiving Area', zone: 'Receiving Area', status: 'pending', assignedSKUs: [], position: [0, -0.3, 9] },
}

// 60 Realistic Inventory Items mapped to correct zones/shelves
const initialInventory: InventoryItem[] = [
  // Beverages (Zone C)
  { sku: 'SKU-B01', name: 'Sprite Bottles', category: 'Beverages', zone: 'Zone C', assignedShelf: 'C1', currentShelf: 'C1', status: 'verified', quantity: 186 },
  { sku: 'SKU-B02', name: 'Coca-Cola', category: 'Beverages', zone: 'Zone C', assignedShelf: 'C1', currentShelf: 'C1', status: 'verified', quantity: 240 },
  { sku: 'SKU-B03', name: 'Pepsi', category: 'Beverages', zone: 'Zone C', assignedShelf: 'C1', currentShelf: 'C1', status: 'verified', quantity: 150 },
  { sku: 'SKU-B04', name: 'Fanta', category: 'Beverages', zone: 'Zone C', assignedShelf: 'C2', currentShelf: 'C2', status: 'verified', quantity: 110 },
  { sku: 'SKU-B05', name: 'Red Bull', category: 'Beverages', zone: 'Zone C', assignedShelf: 'C2', currentShelf: 'C2', status: 'verified', quantity: 380 },
  { sku: 'SKU-B06', name: 'Minute Maid', category: 'Beverages', zone: 'Zone C', assignedShelf: 'C2', currentShelf: 'C2', status: 'verified', quantity: 95 },
  { sku: 'SKU-B07', name: 'SmartWater', category: 'Beverages', zone: 'Zone C', assignedShelf: 'C3', currentShelf: 'C3', status: 'verified', quantity: 300 },
  { sku: 'SKU-B08', name: 'Ginger Ale', category: 'Beverages', zone: 'Zone C', assignedShelf: 'C3', currentShelf: 'C3', status: 'verified', quantity: 120 },

  // Food (Zone B)
  { sku: 'SKU-F01', name: 'Rice Bags', category: 'Food', zone: 'Zone B', assignedShelf: 'B1', currentShelf: 'B1', status: 'verified', quantity: 80 },
  { sku: 'SKU-F02', name: 'Sugar Sacks', category: 'Food', zone: 'Zone B', assignedShelf: 'B1', currentShelf: 'B1', status: 'verified', quantity: 65 },
  { sku: 'SKU-F03', name: 'Flour Tubs', category: 'Food', zone: 'Zone B', assignedShelf: 'B1', currentShelf: 'B1', status: 'verified', quantity: 45 },
  { sku: 'SKU-F04', name: 'Salt Cartons', category: 'Food', zone: 'Zone B', assignedShelf: 'B1', currentShelf: 'B1', status: 'verified', quantity: 200 },
  { sku: 'SKU-F05', name: 'Cooking Oil', category: 'Food', zone: 'Zone B', assignedShelf: 'B1', currentShelf: 'B1', status: 'verified', quantity: 120 },
  { sku: 'SKU-F06', name: 'Oatmeal Boxes', category: 'Food', zone: 'Zone B', assignedShelf: 'B1', currentShelf: 'B1', status: 'verified', quantity: 160 },
  { sku: 'SKU-F07', name: 'Pasta Packs', category: 'Food', zone: 'Zone B', assignedShelf: 'B1', currentShelf: 'B1', status: 'verified', quantity: 400 },
  { sku: 'SKU-F08', name: 'Honey Jars', category: 'Food', zone: 'Zone B', assignedShelf: 'B1', currentShelf: 'B1', status: 'verified', quantity: 85 },

  // Electronics (Zone A)
  { sku: 'SKU-E01', name: 'USB Cables', category: 'Electronics', zone: 'Zone A', assignedShelf: 'A1', currentShelf: 'A1', status: 'verified', quantity: 1200 },
  { sku: 'SKU-E02', name: 'Monitors', category: 'Electronics', zone: 'Zone A', assignedShelf: 'A1', currentShelf: 'A1', status: 'verified', quantity: 35 },
  { sku: 'SKU-E03', name: 'Keyboards', category: 'Electronics', zone: 'Zone A', assignedShelf: 'A1', currentShelf: 'A1', status: 'verified', quantity: 90 },
  { sku: 'SKU-E04', name: 'Routers', category: 'Electronics', zone: 'Zone A', assignedShelf: 'A2', currentShelf: 'A2', status: 'verified', quantity: 42 },
  { sku: 'SKU-E05', name: 'SSDs', category: 'Electronics', zone: 'Zone A', assignedShelf: 'A2', currentShelf: 'A2', status: 'verified', quantity: 180 },
  { sku: 'SKU-E06', name: 'Headsets', category: 'Electronics', zone: 'Zone A', assignedShelf: 'A2', currentShelf: 'A2', status: 'verified', quantity: 60 },
  { sku: 'SKU-E07', name: 'Mousepads', category: 'Electronics', zone: 'Zone A', assignedShelf: 'A3', currentShelf: 'A3', status: 'verified', quantity: 250 },
  { sku: 'SKU-E08', name: 'USB Hubs', category: 'Electronics', zone: 'Zone A', assignedShelf: 'A3', currentShelf: 'A3', status: 'verified', quantity: 140 },
  { sku: 'SKU-E09', name: 'Webcams', category: 'Electronics', zone: 'Zone A', assignedShelf: 'A3', currentShelf: 'A3', status: 'verified', quantity: 70 },

  // Furniture (Zone A)
  { sku: 'SKU-U01', name: 'Office Chairs', category: 'Furniture', zone: 'Zone A', assignedShelf: 'A2', currentShelf: 'A2', status: 'verified', quantity: 24 },
  { sku: 'SKU-U02', name: 'Tables', category: 'Furniture', zone: 'Zone A', assignedShelf: 'A2', currentShelf: 'A2', status: 'verified', quantity: 12 },
  { sku: 'SKU-U03', name: 'Cabinets', category: 'Furniture', zone: 'Zone A', assignedShelf: 'A2', currentShelf: 'A2', status: 'verified', quantity: 8 },
  { sku: 'SKU-U04', name: 'Office Desks', category: 'Furniture', zone: 'Zone A', assignedShelf: 'A3', currentShelf: 'A3', status: 'verified', quantity: 15 },
  { sku: 'SKU-U05', name: 'Bookshelves', category: 'Furniture', zone: 'Zone A', assignedShelf: 'A3', currentShelf: 'A3', status: 'verified', quantity: 10 },
  { sku: 'SKU-U06', name: 'Bar Stools', category: 'Furniture', zone: 'Zone A', assignedShelf: 'A3', currentShelf: 'A3', status: 'verified', quantity: 40 },

  // Industrial (Zone A)
  { sku: 'SKU-I01', name: 'M3 Bolts', category: 'Industrial', zone: 'Zone A', assignedShelf: 'A1', currentShelf: 'A1', status: 'verified', quantity: 5000 },
  { sku: 'SKU-I02', name: 'Bearings', category: 'Industrial', zone: 'Zone A', assignedShelf: 'A1', currentShelf: 'A1', status: 'verified', quantity: 350 },
  { sku: 'SKU-I03', name: 'Motors', category: 'Industrial', zone: 'Zone A', assignedShelf: 'A1', currentShelf: 'A1', status: 'verified', quantity: 18 },
  { sku: 'SKU-I04', name: 'Washers', category: 'Industrial', zone: 'Zone A', assignedShelf: 'A2', currentShelf: 'A2', status: 'verified', quantity: 4000 },
  { sku: 'SKU-I05', name: 'Gears', category: 'Industrial', zone: 'Zone A', assignedShelf: 'A2', currentShelf: 'A2', status: 'verified', quantity: 150 },
  { sku: 'SKU-I06', name: 'Hex Nuts', category: 'Industrial', zone: 'Zone A', assignedShelf: 'A3', currentShelf: 'A3', status: 'verified', quantity: 6000 },
  { sku: 'SKU-I07', name: 'Drive Belts', category: 'Industrial', zone: 'Zone A', assignedShelf: 'A3', currentShelf: 'A3', status: 'verified', quantity: 80 },

  // Medical (Zone B)
  { sku: 'SKU-M01', name: 'Gloves Box', category: 'Medical', zone: 'Zone B', assignedShelf: 'B2', currentShelf: 'B2', status: 'verified', quantity: 500 },
  { sku: 'SKU-M02', name: 'Syringes', category: 'Medical', zone: 'Zone B', assignedShelf: 'B2', currentShelf: 'B2', status: 'verified', quantity: 1200 },
  { sku: 'SKU-M03', name: 'Face Masks', category: 'Medical', zone: 'Zone B', assignedShelf: 'B2', currentShelf: 'B2', status: 'verified', quantity: 2000 },
  { sku: 'SKU-M04', name: 'Bandages', category: 'Medical', zone: 'Zone B', assignedShelf: 'B2', currentShelf: 'B2', status: 'verified', quantity: 800 },
  
  // Refrigerated Medical
  { sku: 'SKU-M05', name: 'Vaccine Coolbox', category: 'Refrigerated Medical', zone: 'Cold Storage', assignedShelf: 'F1', currentShelf: 'F1', status: 'verified', quantity: 12 },

  // Cleaning Supplies (Zone B)
  { sku: 'SKU-C01', name: 'Sanitizer Bottles', category: 'Cleaning Supplies', zone: 'Zone B', assignedShelf: 'B3', currentShelf: 'B3', status: 'verified', quantity: 140 },
  { sku: 'SKU-C02', name: 'Detergent Jugs', category: 'Cleaning Supplies', zone: 'Zone B', assignedShelf: 'B3', currentShelf: 'B3', status: 'verified', quantity: 85 },
  { sku: 'SKU-C03', name: 'Mop Refills', category: 'Cleaning Supplies', zone: 'Zone B', assignedShelf: 'B3', currentShelf: 'B3', status: 'verified', quantity: 150 },
  { sku: 'SKU-C04', name: 'Bleach Containers', category: 'Cleaning Supplies', zone: 'Zone B', assignedShelf: 'B3', currentShelf: 'B3', status: 'verified', quantity: 60 },
  { sku: 'SKU-C05', name: 'Sponge Packs', category: 'Cleaning Supplies', zone: 'Zone B', assignedShelf: 'B3', currentShelf: 'B3', status: 'verified', quantity: 300 },

  // Hazardous (Hazard Storage H1 / H2)
  { sku: 'SKU-H01', name: 'Industrial Paint', category: 'Hazardous', zone: 'Hazard Storage', assignedShelf: 'H1', currentShelf: 'H1', status: 'verified', quantity: 45 },
  { sku: 'SKU-H02', name: 'Batteries', category: 'Hazardous', zone: 'Hazard Storage', assignedShelf: 'H2', currentShelf: 'H1', status: 'error', quantity: 220 }, // Misplaced
  { sku: 'SKU-H03', name: 'Chemical Solvents', category: 'Hazardous', zone: 'Hazard Storage', assignedShelf: 'H1', currentShelf: 'H1', status: 'verified', quantity: 30 },
  { sku: 'SKU-H04', name: 'Thinners', category: 'Hazardous', zone: 'Hazard Storage', assignedShelf: 'H1', currentShelf: 'H1', status: 'verified', quantity: 50 },
  { sku: 'SKU-H05', name: 'Aerosol Sprays', category: 'Hazardous', zone: 'Hazard Storage', assignedShelf: 'H1', currentShelf: 'H1', status: 'verified', quantity: 400 },
  { sku: 'SKU-H06', name: 'Motor Oil', category: 'Hazardous', zone: 'Hazard Storage', assignedShelf: 'H1', currentShelf: 'H1', status: 'verified', quantity: 110 }
]

const initialAlerts: AlertLog[] = [
  { id: 'alert-1', timestamp: '14:20:10', severity: 'critical', message: 'Batteries misplaced on shelf H1 instead of assigned H2. Expected: Hazard Storage. Status: Misplaced', resolved: false, shelfId: 'H1' },
]

const initialActivities: ActivityEvent[] = [
  { id: 'act-1', time: '14:15:32', message: 'Shelf verified: A1.', type: 'success' },
  { id: 'act-2', time: '14:18:12', message: 'Telemetry reader online.', type: 'success' },
  { id: 'act-3', time: '14:20:10', message: 'Item misplaced: Batteries on H1.', type: 'error' },
  { id: 'act-4', time: '14:25:02', message: 'Shelf needs verification: F2.', type: 'warning' },
]

const initialRecommendations: AIRecommendation[] = [
  { id: 'rec-1', title: 'Relocate Fast-Moving Items', description: 'M3 Bolts have high pick volume. Shift closer to Dispatch Area to reduce picker walking times.', impact: '18% efficiency increase', type: 'layout', active: true },
  { id: 'rec-2', title: 'Isolate High Temperature Battery Cell', description: 'Batteries are currently near paint solvents. Relocate H2 contents to climate-controlled Cold Box.', impact: 'Safety risk averted', type: 'safety', active: true }
]

const getNearestAisleX = (x: number): number => {
  const lanes = [-10, -6, -2, 2, 6, 10]
  let nearest = lanes[0]
  let minDist = Math.abs(x - nearest)
  for (const lane of lanes) {
    const dist = Math.abs(x - lane)
    if (dist < minDist) {
      minDist = dist
      nearest = lane
    }
  }
  return nearest
}

export const getAisleSafePath = (start: [number, number, number], end: [number, number, number]): [number, number, number][] => {
  const x1 = start[0]
  const z1 = start[2]
  const x2 = end[0]
  const z2 = end[2]
  const y = start[1]

  const path: [number, number, number][] = []
  path.push([x1, y, z1])

  if (Math.abs(x1 - x2) < 0.1 && Math.abs(z1 - z2) < 0.1) {
    return path
  }

  const startAisleX = getNearestAisleX(x1)
  const endAisleX = getNearestAisleX(x2)

  let corrZ = 5
  if (z1 > 5 || z2 > 5) {
    corrZ = 5
  } else if (z1 < -5 || z2 < -5) {
    corrZ = -5
  } else {
    corrZ = Math.abs(z1 - 5) < Math.abs(z1 - (-5)) ? 5 : -5
  }

  // 1. Exit horizontally to start aisle
  if (Math.abs(x1 - startAisleX) > 0.1) {
    path.push([startAisleX, y, z1])
  }

  // 2. Move along start aisle to corridor Z
  if (Math.abs(z1 - corrZ) > 0.1) {
    path.push([startAisleX, y, corrZ])
  }

  // 3. Move along corridor to end aisle X
  if (Math.abs(startAisleX - endAisleX) > 0.1) {
    path.push([endAisleX, y, corrZ])
  }

  // 4. Move along end aisle to end Z
  if (Math.abs(corrZ - z2) > 0.1) {
    path.push([endAisleX, y, z2])
  }

  // 5. Enter destination shelf horizontally
  if (Math.abs(endAisleX - x2) > 0.1) {
    path.push([x2, y, z2])
  }

  return path
}

export const getShelfCapacity = (shelfId: string): number => {
  if (shelfId.startsWith('A')) return 2500
  if (shelfId.startsWith('F')) return 3000
  if (shelfId.startsWith('B3')) return 18000
  if (shelfId.startsWith('B2')) return 150
  if (shelfId.startsWith('B1')) return 1200
  if (shelfId.startsWith('C')) return 1000
  if (shelfId.startsWith('H')) return 800
  return 1000
}

export const getRecommendedZones = (category: string): string[] => {
  const cat = category.toLowerCase().trim()
  if (['electronics', 'furniture', 'industrial'].includes(cat)) return ['Zone A']
  if (['food', 'cleaning supplies', 'cleaning', 'medical'].includes(cat)) return ['Zone B']
  if (['beverages', 'beverage', 'general merchandise'].includes(cat)) return ['Zone C']
  if (['hazardous', 'hazardous materials', 'batteries', 'chemicals'].includes(cat)) return ['Hazard Storage']
  if (['refrigerated medical', 'perishable goods', 'perishables', 'cold storage'].includes(cat)) return ['Cold Storage']
  return ['Zone A', 'Zone B', 'Zone C']
}

export const getRecommendedShelves = (category: string): string[] => {
  const cat = category.toLowerCase().trim()
  if (['electronics', 'furniture', 'industrial'].includes(cat)) return ['A1', 'A2', 'A3']
  if (['food', 'cleaning supplies', 'cleaning', 'medical'].includes(cat)) return ['B1', 'B2', 'B3']
  if (['beverages', 'beverage', 'general merchandise'].includes(cat)) return ['C1', 'C2', 'C3']
  if (['hazardous', 'hazardous materials', 'batteries', 'chemicals'].includes(cat)) return ['H1', 'H2']
  if (['refrigerated medical', 'perishable goods', 'perishables', 'cold storage'].includes(cat)) return ['F1', 'F2']
  return ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'H1', 'H2', 'F1', 'F2']
}

export const isShelfAllowedForCategory = (category: string, shelfId: string, _shelves?: Record<string, Shelf>): boolean => {
  if (shelfId === 'REC') return true
  const allowedShelves = getRecommendedShelves(category)
  return allowedShelves.includes(shelfId)
}

const syncWarehouseState = (state: any) => {
  const updatedShelves = { ...state.shelves }
  const updatedInventory = [...state.inventory]
  let updatedAlerts = [...state.alerts]

  // 1. Recalculate shelf statuses based on current shelf positions
  Object.keys(updatedShelves).forEach(shelfId => {
    const shelf = updatedShelves[shelfId]
    if (shelfId === 'REC') {
      updatedShelves[shelfId] = { ...shelf, status: 'pending' }
      return
    }
    
    // Find all items currently on this shelf
    const itemsOnShelf = updatedInventory.filter(item => item.currentShelf === shelfId)
    
    // Check if any item on this shelf is misplaced (assignedShelf !== currentShelf)
    const hasMisplaced = itemsOnShelf.some(item => item.assignedShelf !== shelfId && item.currentShelf !== 'REC')
    
    // Check category violation
    const hasCategoryViolation = itemsOnShelf.some(item => !isShelfAllowedForCategory(item.category, shelfId, updatedShelves))
    
    if (hasMisplaced || hasCategoryViolation) {
      updatedShelves[shelfId] = { ...shelf, status: 'error' }
    } else {
      if (shelf.status === 'error') {
        updatedShelves[shelfId] = { ...shelf, status: 'verified' }
      }
    }
  })

  // 2. Clear old alerts that are resolved
  updatedAlerts = updatedAlerts.filter(alert => {
    if (alert.message.includes('ESP32') || alert.message.includes('Device Status') || alert.message.includes('nearing capacity') || alert.message.includes('Receiving Area Full')) {
      return true
    }
    
    if (alert.severity === 'critical') {
      const item = updatedInventory.find(i => alert.message.includes(i.name))
      if (!item) return false
      
      const isMisplaced = item.currentShelf !== item.assignedShelf
      const isInvalidZone = !isShelfAllowedForCategory(item.category, item.currentShelf, updatedShelves)
      return isMisplaced || isInvalidZone
    }
    return true
  })

  // 3. Add critical alerts for currently misplaced or invalid category zone items
  updatedInventory.forEach(item => {
    if (item.currentShelf === 'REC') {
      item.status = 'pending'
      return
    }
    
    const isMisplaced = item.currentShelf !== item.assignedShelf
    const isInvalidZone = !isShelfAllowedForCategory(item.category, item.currentShelf, updatedShelves)
    
    if (isMisplaced || isInvalidZone) {
      item.status = 'error'
      
      const expectedZones = getRecommendedZones(item.category).join(', ')
      const currentZone = updatedShelves[item.currentShelf]?.zone || item.currentShelf
      const alertMsg = isInvalidZone
        ? `${item.name} stored in ${currentZone}. Expected: ${expectedZones}. Status: Misplaced`
        : `${item.name} misplaced on shelf ${item.currentShelf} instead of assigned ${item.assignedShelf}. Expected: ${updatedShelves[item.assignedShelf]?.zone || 'Correct Zone'}. Status: Misplaced`
        
      const alertExists = updatedAlerts.some(a => a.message === alertMsg && !a.resolved)
      if (!alertExists) {
        updatedAlerts.unshift({
          id: `alert-${Date.now()}-${item.sku}`,
          timestamp: new Date().toTimeString().split(' ')[0],
          severity: 'critical',
          message: alertMsg,
          resolved: false,
          shelfId: item.currentShelf
        })
      }
    } else {
      item.status = 'verified'
    }
  })

  // 4. Receiving Area Capacity Rules
  const itemsOnRec = updatedInventory.filter(i => i.currentShelf === 'REC')
  const usedSlots = itemsOnRec.reduce((acc, curr) => acc + Math.ceil(curr.quantity / 10), 0)

  // Clear any existing receiving capacity alerts
  updatedAlerts = updatedAlerts.filter(alert => 
    !(alert.message.includes('Receiving Area nearing capacity') || alert.message.includes('Receiving Area Full'))
  )

  if (usedSlots >= 20) {
    updatedAlerts.unshift({
      id: `alert-rec-full-${Date.now()}`,
      timestamp: new Date().toTimeString().split(' ')[0],
      severity: 'critical',
      message: `Receiving Area Full: ${usedSlots}/20 slots occupied. Relocate inventory now.`,
      resolved: false,
      shelfId: 'REC'
    })
  } else if (usedSlots >= 15) {
    updatedAlerts.unshift({
      id: `alert-rec-near-${Date.now()}`,
      timestamp: new Date().toTimeString().split(' ')[0],
      severity: 'warning',
      message: `Receiving Area nearing capacity: ${usedSlots}/20 slots occupied.`,
      resolved: false,
      shelfId: 'REC'
    })
  }

  return {
    shelves: updatedShelves,
    alerts: updatedAlerts
  }
}

// Startup active worker task to move Batteries from H1 to H2
const initialWorkers: Record<string, WorkerState> = {
  alpha: {
    id: 'alpha',
    name: 'Alpha Forklift',
    status: 'idle',
    position: [-6, -0.3, 9],
    basePosition: [-6, -0.3, 9],
    targetShelfId: null,
    currentTaskId: null,
    progress: 0,
    label: 'Worker Idle',
    path: null,
    pathIndex: 0,
    carriedItemName: null,
    color: '#FF6B35'
  },
  beta: {
    id: 'beta',
    name: 'Beta Forklift',
    status: 'idle',
    position: [6, -0.3, 9],
    basePosition: [6, -0.3, 9],
    targetShelfId: null,
    currentTaskId: null,
    progress: 0,
    label: 'Worker Idle',
    path: null,
    pathIndex: 0,
    carriedItemName: null,
    color: '#5A5D64'
  }
}

const initialTaskQueue: TaskItem[] = [
  {
    id: 'task-1',
    itemName: 'Batteries',
    itemShelfId: 'H1',
    correctShelfId: 'H2',
    status: 'pending',
    assignedWorkerId: null,
    type: 'automated'
  }
]

const initialManualTask: ManualTaskState = {
  workerId: null,
  step: 'none',
  itemName: null,
  itemShelfId: null,
  correctShelfId: null
}

export const useInvenioStore = create<InvenioState>((set, get) => ({
  // Theme locked to Dark
  theme: 'dark',
  activeRoute: 'dashboard',
  demoMode: true,

  // Connections
  connections: {
    mqtt: 'connected',
    websocket: 'connected',
    database: 'connected',
    esp32: 'connected'
  },
  networkHealth: 99,
  networkLatency: 12, // Let's keep latency
  latency: 12,
  eventThroughput: [4, 6, 5, 8, 4, 7, 5, 6, 8, 9],

  // Digital Twin
  shelves: initialShelves,
  
  // Inventory
  inventory: initialInventory,

  // Pathfinding
  focusedShelfId: null,
  focusedItemSku: null,
  focusedItemName: null,
  activePath: null,
  pathDistance: null,
  pathETA: null,
  searchQuery: '',

  // Workers & Queue
  workers: initialWorkers,
  taskQueue: initialTaskQueue,
  manualTask: initialManualTask,
  manualTaskFeedback: null,
  followingWorkerId: null,
  followWorkerPrompt: null,

  // Logs & recommendations
  alerts: initialAlerts,
  activities: initialActivities,
  recommendations: initialRecommendations,
  notifications: [],

  // Actions
  setRoute: (route) => set({ activeRoute: route }),
  
  setDemoMode: (enabled) => set({ demoMode: enabled }),

  setFollowingWorkerId: (id) => set({ followingWorkerId: id }),
  setFollowWorkerPrompt: (id) => set({ followWorkerPrompt: id }),

  addNotification: (message, type) => set((state) => {
    const newNotif = {
      id: `notif-${Date.now()}-${Math.random()}`,
      message,
      type,
      timestamp: new Date().toTimeString().split(' ')[0]
    };
    return { notifications: [newNotif, ...state.notifications].slice(0, 5) };
  }),

  dismissNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
  
  setConnectionStatus: (service, status) => set((state) => ({
    connections: {
      ...state.connections,
      [service]: status
    },
    networkHealth: Math.max(
      10, 
      99 - 
      (status === 'offline' ? 25 : status === 'connecting' ? 10 : 0) * 
      (service === 'esp32' ? 1.5 : 1)
    )
  })),

  updateThroughput: (val) => set((state) => {
    const next = [...state.eventThroughput.slice(1), val];
    return { eventThroughput: next };
  }),

  tickTelemetry: () => set((state) => {
    if (!state.demoMode) return {};
    const flux = Math.floor(Math.random() * 4) - 2;
    const newLatency = Math.max(5, Math.min(80, state.latency + flux));
    const newThroughput = Math.max(2, Math.min(20, state.eventThroughput[9] + (Math.floor(Math.random() * 3) - 1)));
    return {
      latency: newLatency,
      eventThroughput: [...state.eventThroughput.slice(1), newThroughput]
    };
  }),

  // Simulators
  simulatePlacement: (shelfId, isCorrect) => set((state) => {
    if (state.manualTask.workerId !== null) return {};
    const timeStr = new Date().toTimeString().split(' ')[0];
    const shelf = state.shelves[shelfId];
    if (!shelf) return {};

    const updatedShelves = {
      ...state.shelves,
      [shelfId]: {
        ...shelf,
        status: (isCorrect ? 'verified' : 'pending') as ShelfStatus
      }
    };

    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`,
      time: timeStr,
      message: isCorrect 
        ? `Shelf verified: ${shelf.name}` 
        : `Verification pending: ${shelf.name}`,
      type: isCorrect ? 'success' : 'warning'
    };

    let updatedAlerts = [...state.alerts];
    if (isCorrect) {
      updatedAlerts = state.alerts.filter(a => a.shelfId !== shelfId);
    } else {
      updatedAlerts.push({
        id: `alert-${Date.now()}`,
        timestamp: timeStr,
        severity: 'warning',
        message: `Shelf ${shelfId} needs verification`,
        resolved: false,
        shelfId
      });
    }

    return {
      shelves: updatedShelves,
      activities: [newActivity, ...state.activities.slice(0, 49)],
      alerts: updatedAlerts
    };
  }),

  simulateTimeout: (shelfId) => set((state) => {
    if (state.manualTask.workerId !== null) return {};
    const timeStr = new Date().toTimeString().split(' ')[0];
    const shelf = state.shelves[shelfId];
    if (!shelf) return {};

    // Find first item in this shelf zone that matches, or just general batteries/solvent
    const shelfItem = state.inventory.find(i => i.assignedShelf === shelfId) || state.inventory[0];

    // Modify item current position to be H1 instead of its assigned shelf to simulate a misplaced item
    const updatedInventory = state.inventory.map(item => {
      if (item.assignedShelf === shelfId) {
        return { ...item, status: 'error' as ShelfStatus, currentShelf: 'H1' };
      }
      return item;
    });

    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`,
      time: timeStr,
      message: `Item misplaced: ${shelfItem.name} on H1`,
      type: 'error'
    };

    // Automatically trigger a worker task to resolve this misplaced item!
    setTimeout(() => {
      get().assignWorkerTask(shelfItem.name, 'H1', shelfId);
    }, 100);

    const baseState = {
      shelves: state.shelves,
      inventory: updatedInventory,
      alerts: state.alerts
    };

    const sync = syncWarehouseState(baseState);

    return {
      inventory: updatedInventory,
      shelves: sync.shelves,
      activities: [newActivity, ...state.activities.slice(0, 49)],
      alerts: sync.alerts
    };
  }),

  simulateDeviceStatus: (online) => set((state) => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    const statusVal = online ? 'connected' : 'offline';
    
    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`,
      time: timeStr,
      message: online 
        ? `ESP32 device back online` 
        : `ESP32 offline`,
      type: online ? 'success' : 'error'
    };

    let updatedAlerts = [...state.alerts];
    if (online) {
      updatedAlerts = state.alerts.filter(a => !a.message.includes('ESP32'));
    } else {
      updatedAlerts.push({
        id: `alert-${Date.now()}`,
        timestamp: timeStr,
        severity: 'critical',
        message: `ESP32 offline`,
        resolved: false
      });
    }

    return {
      connections: {
        ...state.connections,
        esp32: statusVal
      },
      networkHealth: online ? 99 : 74,
      activities: [newActivity, ...state.activities.slice(0, 49)],
      alerts: updatedAlerts
    };
  }),

  simulateNewArrival: () => set((state) => {
    const timeStr = new Date().toTimeString().split(' ')[0]
    const items = [
      { name: 'Sprite Bottles', category: 'Beverages', qty: 120, assignedShelf: 'C3', zone: 'Zone C' },
      { name: 'Batteries', category: 'Electronics', qty: 80, assignedShelf: 'A2', zone: 'Zone A' },
      { name: 'Sugar Sacks', category: 'Food', qty: 150, assignedShelf: 'B2', zone: 'Zone B' }
    ]
    const chosen = items[Math.floor(Math.random() * items.length)]
    
    // Check capacity
    const itemsOnRec = state.inventory.filter(i => i.currentShelf === 'REC')
    const usedSlots = itemsOnRec.reduce((acc, curr) => acc + Math.ceil(curr.quantity / 10), 0)
    const incomingSlots = Math.ceil(chosen.qty / 10)
    
    if (usedSlots + incomingSlots > 20) {
      const alertMsg = `Arrival Rejected: Receiving Area Full.`
      const alertExists = state.alerts.some(a => a.message === alertMsg && !a.resolved)
      let updatedAlerts = [...state.alerts]
      if (!alertExists) {
        updatedAlerts.unshift({
          id: `alert-rej-${Date.now()}`,
          timestamp: timeStr,
          severity: 'critical',
          message: alertMsg,
          resolved: false,
          shelfId: 'REC'
        })
      }
      return { alerts: updatedAlerts }
    }

    const sku = `SKU-N${Math.floor(100 + Math.random() * 899)}`
    const newItem: InventoryItem = {
      sku,
      name: chosen.name,
      category: chosen.category,
      zone: 'Receiving Area',
      assignedShelf: chosen.assignedShelf,
      currentShelf: 'REC',
      status: 'pending',
      quantity: chosen.qty
    }

    const updatedInventory = [newItem, ...state.inventory]
    
    const taskId = `task-arrival-${Date.now()}`
    const newTask: TaskItem = {
      id: taskId,
      itemName: chosen.name,
      itemShelfId: 'REC',
      correctShelfId: chosen.assignedShelf,
      status: 'pending',
      assignedWorkerId: null,
      type: 'automated'
    }

    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`,
      time: timeStr,
      message: `New Inventory Arrived: ${chosen.name} (${chosen.qty} units) at Receiving Area. Status: Awaiting Placement.`,
      type: 'info'
    }

    const newNotif = {
      id: `notif-${Date.now()}-${Math.random()}`,
      message: `New Cargo Arrived: ${chosen.name} (${chosen.qty} units) in Receiving Area. Task created.`,
      type: 'info' as const,
      timestamp: timeStr
    }

    const baseState = {
      shelves: state.shelves,
      inventory: updatedInventory,
      alerts: state.alerts
    }

    const sync = syncWarehouseState(baseState)

    return {
      inventory: updatedInventory,
      shelves: sync.shelves,
      alerts: sync.alerts,
      taskQueue: [...state.taskQueue, newTask],
      activities: [newActivity, ...state.activities.slice(0, 49)],
      notifications: [newNotif, ...state.notifications].slice(0, 5)
    }
  }),

  simulateAIRecommendation: () => set((state) => {
    if (state.manualTask.workerId !== null) return {};
    const recs: AIRecommendation[] = [
      {
        id: `rec-${Date.now()}`,
        title: 'Safety Hazard Detected',
        description: 'Batteries are stored close to Chemical Solvents on H1. Displace to Cold Storage F2.',
        impact: 'Hazard eliminated',
        type: 'safety',
        active: true
      },
      {
        id: `rec-${Date.now()}`,
        title: 'Low Stock Forecast',
        description: 'Office Chairs quantity is down to 24 units. Reorder suggested within 3 days.',
        impact: 'Out-of-stock risk minimized',
        type: 'efficiency',
        active: true
      }
    ];

    const chosen = recs[Math.floor(Math.random() * recs.length)];
    const timeStr = new Date().toTimeString().split(' ')[0];

    if (state.recommendations.some(r => r.title === chosen.title)) {
      return {};
    }

    return {
      recommendations: [chosen, ...state.recommendations],
      activities: [
        {
          id: `act-${Date.now()}`,
          time: timeStr,
          message: `AI recommendation generated`,
          type: 'info'
        },
        ...state.activities.slice(0, 49)
      ]
    };
  }),

  // AI Navigation pathfinding
  locateItem: (itemNameOrSku) => {
    const state = get();
    const query = itemNameOrSku.toLowerCase().trim();
    
    const item = state.inventory.find(
      i => i.name.toLowerCase().includes(query) || i.sku.toLowerCase() === query
    );
    
    if (!item) return false;
    
    const shelfId = item.currentShelf || item.assignedShelf;
    const shelf = state.shelves[shelfId];
    if (!shelf) return false;

    const shelfPos = shelf.position;
    // Use the aisle-safe pathfinder
    const path = getAisleSafePath([0, -0.3, 9], [shelfPos[0], -0.3, shelfPos[2]]);

    let dist = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i+1];
      dist += Math.sqrt(
        Math.pow(p1[0] - p2[0], 2) +
        Math.pow(p1[1] - p2[1], 2) +
        Math.pow(p1[2] - p2[2], 2)
      );
    }
    
    const scaledDistance = Math.round(dist * 6);
    const etaSeconds = Math.round(scaledDistance / 1.4);

    set({
      focusedShelfId: shelfId,
      focusedItemSku: item.sku,
      focusedItemName: item.name,
      activePath: path,
      pathDistance: scaledDistance,
      pathETA: etaSeconds,
      activeRoute: 'twin' // Switches to Digital Twin automatically
    });

    return true;
  },

  clearActivePath: () => set({
    focusedShelfId: null,
    focusedItemSku: null,
    focusedItemName: null,
    activePath: null,
    pathDistance: null,
    pathETA: null
  }),

  // Worker Tick loop (runs smoothly to animate progress)
  tickWorker: (delta) => set((state) => {
    const updatedWorkers = { ...state.workers };
    const updatedTaskQueue = [...state.taskQueue];
    let updatedInventory = [...state.inventory];
    let updatedShelves = { ...state.shelves };
    let updatedAlerts = [...state.alerts];
    let updatedActivities = [...state.activities];

    // Tick each worker
    Object.keys(updatedWorkers).forEach((workerId) => {
      const worker = updatedWorkers[workerId];
      
      const isManualDemoActive = state.manualTask.workerId !== null;
      
      if (worker.status === 'idle') {
        if (state.demoMode && !isManualDemoActive) {
          // Find first pending automated task with no worker assigned
          const nextTask = updatedTaskQueue.find(t => t.status === 'pending' && t.type === 'automated' && t.assignedWorkerId === null);
          if (nextTask) {
            // Instantly reserve
            nextTask.status = 'reserved';
            nextTask.assignedWorkerId = workerId;
            
            const itemShelf = state.shelves[nextTask.itemShelfId];
            if (itemShelf) {
              worker.status = 'moving_to_item';
              worker.currentTaskId = nextTask.id;
              worker.targetShelfId = nextTask.itemShelfId;
              worker.carriedItemName = null;
              worker.path = getAisleSafePath(worker.position, itemShelf.position);
              worker.pathIndex = 0;
              worker.progress = 0;
              worker.label = `Moving to ${nextTask.itemName}`;
            }

            // Sync task inside array
            const taskIndex = updatedTaskQueue.findIndex(t => t.id === nextTask.id);
            if (taskIndex !== -1) {
              updatedTaskQueue[taskIndex] = { ...nextTask };
            }
          } else {
            worker.label = "Available";
          }
        } else {
          worker.label = "Available";
        }
        return;
      }

      // Check collision avoidance
      if (workerId === 'beta' && updatedWorkers.alpha.status !== 'idle') {
        const posA = updatedWorkers.alpha.position;
        const posB = worker.position;
        const dx = posA[0] - posB[0];
        const dz = posA[2] - posB[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 2.0) {
          worker.label = "Collision Yield: Waiting...";
          return;
        }
      }

      const isManual = isManualDemoActive && state.manualTask.workerId === workerId;
      const step = state.manualTask.step;

      // Handle stationary states (picking, placing)
      if (worker.status === 'picking_item') {
        if (isManual && step === 'moving_to_item') {
          worker.label = `Ready to Pick ${state.manualTask.itemName}`;
          return;
        }
        
        worker.progress += delta * 1.2;
        worker.label = `Picking ${worker.carriedItemName || 'Cargo'}`;
        
        if (worker.progress >= 1) {
          worker.progress = 0;
          if (isManual) {
            worker.carriedItemName = state.manualTask.itemName;
            worker.label = `Item Loaded (Ready to Deliver)`;
            set((s) => ({
              manualTask: { ...s.manualTask, step: 'picked' }
            }));
          } else {
            const activeTask = updatedTaskQueue.find(t => t.id === worker.currentTaskId);
            if (activeTask) {
              worker.carriedItemName = activeTask.itemName;
              const correctShelf = state.shelves[activeTask.correctShelfId];
              if (correctShelf) {
                worker.status = 'moving_to_shelf';
                worker.targetShelfId = activeTask.correctShelfId;
                worker.path = getAisleSafePath(worker.position, correctShelf.position);
                worker.pathIndex = 0;
                worker.label = `Moving ${activeTask.itemName} to ${activeTask.correctShelfId}`;
              }
            }
          }
        }
      }
      else if (worker.status === 'placing_item') {
        if (isManual && step === 'moving_to_shelf') {
          worker.label = `Ready to Place & Verify`;
          return;
        }
        
        worker.progress += delta * 1.2;
        worker.label = `Verifying placement...`;
        
        if (worker.progress >= 1) {
          worker.progress = 0;
          worker.carriedItemName = null;
          
          if (isManual) {
            const item = updatedInventory.find(i => i.name.toLowerCase() === state.manualTask.itemName?.toLowerCase());
            if (item && state.manualTask.correctShelfId) {
              item.currentShelf = state.manualTask.correctShelfId;
              item.status = 'verified';
            }
            
            const sync = syncWarehouseState({ shelves: updatedShelves, inventory: updatedInventory, alerts: updatedAlerts });
            updatedShelves = sync.shelves;
            updatedAlerts = sync.alerts;

            worker.label = `Shelf Verified! Ready to Return`;
            
            set((s) => ({
              manualTask: { ...s.manualTask, step: 'placed' }
            }));
            
            updatedTaskQueue.forEach(t => {
              if (t.itemName.toLowerCase() === state.manualTask.itemName?.toLowerCase() && t.correctShelfId === state.manualTask.correctShelfId) {
                t.status = 'completed';
              }
            });

            const timeStr = new Date().toTimeString().split(' ')[0];
            updatedActivities.unshift({
              id: `act-${Date.now()}`,
              time: timeStr,
              message: `Shelf verified: ${state.manualTask.correctShelfId}`,
              type: 'success'
            });
          } else {
            const activeTask = updatedTaskQueue.find(t => t.id === worker.currentTaskId);
            if (activeTask) {
              activeTask.status = 'completed';
              
              const item = updatedInventory.find(i => i.name.toLowerCase() === activeTask.itemName.toLowerCase());
              if (item) {
                item.currentShelf = activeTask.correctShelfId;
                item.status = 'verified';
              }
              
              const sync = syncWarehouseState({ shelves: updatedShelves, inventory: updatedInventory, alerts: updatedAlerts });
              updatedShelves = sync.shelves;
              updatedAlerts = sync.alerts;

              const timeStr = new Date().toTimeString().split(' ')[0];
              updatedActivities.unshift({
                id: `act-${Date.now()}`,
                time: timeStr,
                message: `Shelf verified: ${activeTask.correctShelfId}`,
                type: 'success'
              });

              worker.status = 'returning';
              worker.targetShelfId = null;
              worker.path = getAisleSafePath(worker.position, worker.basePosition);
              worker.pathIndex = 0;
              worker.label = `Returning to Base`;
            }
          }
        }
      }
      else if (worker.status === 'moving_to_item' || worker.status === 'moving_to_shelf' || worker.status === 'returning') {
        if (worker.path && worker.pathIndex < worker.path.length - 1) {
          worker.progress += delta * 1.5;
          const p1 = worker.path[worker.pathIndex];
          const p2 = worker.path[worker.pathIndex + 1];
          worker.position = [
            p1[0] + (p2[0] - p1[0]) * worker.progress,
            p1[1],
            p1[2] + (p2[2] - p1[2]) * worker.progress
          ];

          if (worker.status === 'moving_to_item') {
            const taskName = isManual ? state.manualTask.itemName : updatedTaskQueue.find(t => t.id === worker.currentTaskId)?.itemName;
            worker.label = `Moving to ${taskName || 'Item'}`;
          } else if (worker.status === 'moving_to_shelf') {
            const task = isManual ? state.manualTask : updatedTaskQueue.find(t => t.id === worker.currentTaskId);
            worker.label = `Moving ${task?.itemName || 'Cargo'} to ${task?.correctShelfId}`;
          } else {
            worker.label = `Returning to Base`;
          }

          if (worker.progress >= 1) {
            worker.progress = 0;
            worker.pathIndex += 1;
            
            if (worker.pathIndex >= worker.path.length - 1) {
              if (worker.status === 'moving_to_item') {
                worker.status = 'picking_item';
                if (isManual) {
                  set((s) => ({
                    manualTask: { ...s.manualTask, step: 'moving_to_item' }
                  }));
                } else {
                  // Only assigned worker can convert reserved -> active
                  const activeTask = updatedTaskQueue.find(t => t.id === worker.currentTaskId);
                  if (activeTask && activeTask.assignedWorkerId === workerId) {
                    activeTask.status = 'active';
                    const taskIndex = updatedTaskQueue.findIndex(t => t.id === activeTask.id);
                    if (taskIndex !== -1) {
                      updatedTaskQueue[taskIndex] = { ...activeTask };
                    }
                  }
                }
              } else if (worker.status === 'moving_to_shelf') {
                worker.status = 'placing_item';
                if (isManual) {
                  set((s) => ({
                    manualTask: { ...s.manualTask, step: 'moving_to_shelf' }
                  }));
                }
              } else if (worker.status === 'returning') {
                worker.status = 'idle';
                worker.currentTaskId = null;
                worker.targetShelfId = null;
                worker.carriedItemName = null;
                worker.path = null;
                worker.pathIndex = 0;
                worker.progress = 0;
                worker.label = "Available";
                
                if (isManual) {
                  set({
                    manualTaskFeedback: {
                      itemName: state.manualTask.itemName || 'Cargo',
                      correctShelfId: state.manualTask.correctShelfId || 'Shelf',
                      workerId: workerId
                    },
                    manualTask: {
                      workerId: null,
                      step: 'none',
                      itemName: null,
                      itemShelfId: null,
                      correctShelfId: null
                    }
                  });
                }
              }
            }
          }
        } else {
          worker.status = 'idle';
        }
      }
    });

    return {
      workers: updatedWorkers,
      taskQueue: updatedTaskQueue,
      inventory: updatedInventory,
      shelves: updatedShelves,
      alerts: updatedAlerts,
      activities: updatedActivities.slice(0, 50)
    };
  }),

  assignWorkerTask: (itemName, itemShelf, correctShelf) => {
    get().addTaskToQueue(itemName, itemShelf, correctShelf, 'automated');
  },

  addTaskToQueue: (itemName, itemShelfId, correctShelfId, type = 'automated') => set((state) => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    const taskId = `task-${Date.now()}`;
    const newTask: TaskItem = {
      id: taskId,
      itemName,
      itemShelfId,
      correctShelfId,
      status: 'pending',
      assignedWorkerId: null,
      type
    };

    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`,
      time: timeStr,
      message: `Task added: Move ${itemName} to ${correctShelfId}`,
      type: 'info'
    };

    return {
      taskQueue: [...state.taskQueue, newTask],
      activities: [newActivity, ...state.activities.slice(0, 49)]
    };
  }),

  assignManualWorker: (workerId, itemName, itemShelfId, correctShelfId) => set((state) => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    
    // Reset worker state first
    const updatedWorkers = { ...state.workers };
    updatedWorkers[workerId] = {
      ...updatedWorkers[workerId],
      status: 'idle',
      progress: 0,
      carriedItemName: null,
      path: null,
      pathIndex: 0,
      label: `Assigned: ${itemName}`,
      targetShelfId: itemShelfId
    };

    // Add manual task queue item too
    const taskId = `task-manual-${Date.now()}`;
    const newTask: TaskItem = {
      id: taskId,
      itemName,
      itemShelfId,
      correctShelfId,
      status: 'active',
      assignedWorkerId: workerId,
      type: 'manual'
    };

    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`,
      time: timeStr,
      message: `Manual override: ${workerId.toUpperCase()} Forklift assigned`,
      type: 'info'
    };

    return {
      workers: updatedWorkers,
      manualTask: {
        workerId,
        step: 'assigned',
        itemName,
        itemShelfId,
        correctShelfId
      },
      taskQueue: [...state.taskQueue, newTask],
      activities: [newActivity, ...state.activities.slice(0, 49)]
    };
  }),

  moveManualWorkerToItem: (workerId) => set((state) => {
    const worker = state.workers[workerId];
    if (!worker || !state.manualTask.itemShelfId) return {};

    const itemShelf = state.shelves[state.manualTask.itemShelfId];
    if (!itemShelf) return {};

    const updatedWorkers = { ...state.workers };
    updatedWorkers[workerId] = {
      ...worker,
      status: 'moving_to_item',
      path: getAisleSafePath(worker.position, itemShelf.position),
      pathIndex: 0,
      progress: 0,
      label: `Moving to ${state.manualTask.itemName}`
    };

    return {
      workers: updatedWorkers,
      manualTask: {
        ...state.manualTask,
        step: 'assigned' // Keep step as assigned while moving, tickWorker transitions it
      },
      followWorkerPrompt: workerId
    };
  }),

  pickManualItem: (workerId) => set((state) => {
    const worker = state.workers[workerId];
    if (!worker) return {};

    const updatedWorkers = { ...state.workers };
    updatedWorkers[workerId] = {
      ...worker,
      status: 'picking_item',
      progress: 0,
      label: `Picking ${state.manualTask.itemName}`
    };

    return {
      workers: updatedWorkers,
      manualTask: {
        ...state.manualTask,
        step: 'picking'
      }
    };
  }),

  deliverManualItem: (workerId) => set((state) => {
    const worker = state.workers[workerId];
    if (!worker || !state.manualTask.correctShelfId) return {};

    const correctShelf = state.shelves[state.manualTask.correctShelfId];
    if (!correctShelf) return {};

    const updatedWorkers = { ...state.workers };
    updatedWorkers[workerId] = {
      ...worker,
      status: 'moving_to_shelf',
      path: getAisleSafePath(worker.position, correctShelf.position),
      pathIndex: 0,
      progress: 0,
      label: `Moving ${state.manualTask.itemName} to ${state.manualTask.correctShelfId}`,
      targetShelfId: state.manualTask.correctShelfId
    };

    return {
      workers: updatedWorkers,
      manualTask: {
        ...state.manualTask,
        step: 'picked'
      },
      followWorkerPrompt: workerId
    };
  }),

  placeManualItem: (workerId) => set((state) => {
    const worker = state.workers[workerId];
    if (!worker) return {};

    const updatedWorkers = { ...state.workers };
    updatedWorkers[workerId] = {
      ...worker,
      status: 'placing_item',
      progress: 0,
      label: `Verifying shelf ${state.manualTask.correctShelfId}`
    };

    return {
      workers: updatedWorkers,
      manualTask: {
        ...state.manualTask,
        step: 'placing'
      }
    };
  }),

  sendManualWorkerToBase: (workerId) => set((state) => {
    const worker = state.workers[workerId];
    if (!worker) return {};

    const updatedWorkers = { ...state.workers };
    updatedWorkers[workerId] = {
      ...worker,
      status: 'returning',
      path: getAisleSafePath(worker.position, worker.basePosition),
      pathIndex: 0,
      progress: 0,
      label: `Returning to Base`
    };

    return {
      workers: updatedWorkers,
      manualTask: {
        ...state.manualTask,
        step: 'placed'
      },
      followWorkerPrompt: workerId
    };
  }),

  cancelManualTask: (workerId) => set((state) => {
    const worker = state.workers[workerId];
    if (!worker) return {};

    const updatedWorkers = { ...state.workers };
    updatedWorkers[workerId] = {
      ...worker,
      status: 'returning',
      path: getAisleSafePath(worker.position, worker.basePosition),
      pathIndex: 0,
      progress: 0,
      label: `Task cancelled: Returning to Base`
    };

    return {
      workers: updatedWorkers,
      manualTask: {
        workerId: null,
        step: 'none',
        itemName: null,
        itemShelfId: null,
        correctShelfId: null
      }
    };
  }),

  clearManualTaskFeedback: () => set({ manualTaskFeedback: null }),

  assignWorkerToFixAlert: (alertId, preferredWorkerId = 'best') => set((state) => {
    const alert = state.alerts.find(a => a.id === alertId);
    if (!alert) return {};

    const item = state.inventory.find(i => 
      (i.currentShelf === alert.shelfId || i.assignedShelf === alert.shelfId) && 
      (i.currentShelf !== i.assignedShelf || !isShelfAllowedForCategory(i.category, i.currentShelf, state.shelves))
    );

    if (!item) return {};

    let targetShelf = item.assignedShelf;
    if (!isShelfAllowedForCategory(item.category, targetShelf, state.shelves)) {
      const recShelves = getRecommendedShelves(item.category);
      targetShelf = recShelves[0] || 'A1';
      item.assignedShelf = targetShelf;
    }

    // Determine assigned worker ID
    let assignedWorkerId: 'alpha' | 'beta' | null = null;
    if (preferredWorkerId === 'alpha' && state.workers.alpha.status === 'idle') {
      assignedWorkerId = 'alpha';
    } else if (preferredWorkerId === 'beta' && state.workers.beta.status === 'idle') {
      assignedWorkerId = 'beta';
    } else {
      // Find best available (idle) worker
      if (state.workers.alpha.status === 'idle') {
        assignedWorkerId = 'alpha';
      } else if (state.workers.beta.status === 'idle') {
        assignedWorkerId = 'beta';
      }
    }

    if (!assignedWorkerId) {
      // Fallback if both are busy, assign to alpha
      assignedWorkerId = 'alpha';
    }

    const taskId = `task-fix-${Date.now()}`;
    const newTask: TaskItem = {
      id: taskId,
      itemName: item.name,
      itemShelfId: item.currentShelf,
      correctShelfId: targetShelf,
      status: 'reserved',
      assignedWorkerId,
      type: 'automated'
    };

    const updatedAlerts = state.alerts.map(a => a.id === alertId ? { ...a, resolved: true } : a);
    const timeStr = new Date().toTimeString().split(' ')[0];
    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`,
      time: timeStr,
      message: `Fix assigned: dispatches ${assignedWorkerId.toUpperCase()} to move ${item.name} to ${targetShelf}`,
      type: 'success'
    };

    // Trigger worker movement immediately!
    const updatedWorkers = { ...state.workers };
    const worker = updatedWorkers[assignedWorkerId];
    if (worker) {
      worker.status = 'moving_to_item';
      worker.currentTaskId = taskId;
      worker.targetShelfId = item.currentShelf;
      worker.carriedItemName = null;
      worker.path = getAisleSafePath(worker.position, state.shelves[item.currentShelf]?.position || [0, -0.3, 9]);
      worker.pathIndex = 0;
      worker.progress = 0;
      worker.label = `Moving to ${item.name}`;
    }

    const notifMsg = `Fix Dispatch: ${assignedWorkerId.toUpperCase()} moving ${item.name} to ${targetShelf}.`;
    const newNotif = {
      id: `notif-${Date.now()}`,
      message: notifMsg,
      type: 'success' as const,
      timestamp: timeStr
    };

    return {
      workers: updatedWorkers,
      taskQueue: [...state.taskQueue, newTask],
      alerts: updatedAlerts,
      activities: [newActivity, ...state.activities.slice(0, 49)],
      notifications: [newNotif, ...state.notifications].slice(0, 5),
      followWorkerPrompt: assignedWorkerId
    };
  }),

  dispatchWorkerToTask: (taskId, preferredWorkerId) => set((state) => {
    const taskIndex = state.taskQueue.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return {};
    const task = state.taskQueue[taskIndex];

    let assignedWorkerId: 'alpha' | 'beta' | null = null;
    if (preferredWorkerId === 'alpha' && state.workers.alpha.status === 'idle') {
      assignedWorkerId = 'alpha';
    } else if (preferredWorkerId === 'beta' && state.workers.beta.status === 'idle') {
      assignedWorkerId = 'beta';
    } else {
      if (state.workers.alpha.status === 'idle') {
        assignedWorkerId = 'alpha';
      } else if (state.workers.beta.status === 'idle') {
        assignedWorkerId = 'beta';
      }
    }

    if (!assignedWorkerId) {
      assignedWorkerId = 'alpha';
    }

    const updatedTaskQueue = [...state.taskQueue];
    updatedTaskQueue[taskIndex] = {
      ...task,
      status: 'reserved',
      assignedWorkerId
    };

    const updatedWorkers = { ...state.workers };
    const worker = updatedWorkers[assignedWorkerId];
    if (worker) {
      worker.status = 'moving_to_item';
      worker.currentTaskId = taskId;
      worker.targetShelfId = task.itemShelfId;
      worker.carriedItemName = null;
      worker.path = getAisleSafePath(worker.position, state.shelves[task.itemShelfId]?.position || [0, -0.3, 9]);
      worker.pathIndex = 0;
      worker.progress = 0;
      worker.label = `Moving to ${task.itemName}`;
    }

    const timeStr = new Date().toTimeString().split(' ')[0];
    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`,
      time: timeStr,
      message: `Manual Dispatch: ${assignedWorkerId.toUpperCase()} moving ${task.itemName} from ${task.itemShelfId} to ${task.correctShelfId}`,
      type: 'success'
    };

    const notifMsg = `Manual Dispatch: Dispatched ${assignedWorkerId.toUpperCase()} to relocate ${task.itemName}.`;
    const newNotif = {
      id: `notif-${Date.now()}`,
      message: notifMsg,
      type: 'success' as const,
      timestamp: timeStr
    };

    return {
      taskQueue: updatedTaskQueue,
      workers: updatedWorkers,
      activities: [newActivity, ...state.activities.slice(0, 49)],
      notifications: [newNotif, ...state.notifications].slice(0, 5),
      followWorkerPrompt: assignedWorkerId
    };
  }),

  cancelTask: (taskId) => set((state) => {
    const task = state.taskQueue.find(t => t.id === taskId);
    if (!task) return {};

    const updatedWorkers = { ...state.workers };
    if (task.assignedWorkerId && updatedWorkers[task.assignedWorkerId]) {
      const w = updatedWorkers[task.assignedWorkerId];
      w.status = 'idle';
      w.currentTaskId = null;
      w.targetShelfId = null;
      w.carriedItemName = null;
      w.path = null;
      w.label = 'Available';
    }

    const updatedTaskQueue = state.taskQueue.filter(t => t.id !== taskId);
    const timeStr = new Date().toTimeString().split(' ')[0];
    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`,
      time: timeStr,
      message: `Task Canceled: Move ${task.itemName} to ${task.correctShelfId}`,
      type: 'warning'
    };

    const notifMsg = `Task Canceled: Relocation of ${task.itemName} canceled.`;
    const newNotif = {
      id: `notif-${Date.now()}`,
      message: notifMsg,
      type: 'warning' as const,
      timestamp: timeStr
    };

    return {
      taskQueue: updatedTaskQueue,
      workers: updatedWorkers,
      activities: [newActivity, ...state.activities.slice(0, 49)],
      notifications: [newNotif, ...state.notifications].slice(0, 5)
    };
  }),

  // NLP AI Search & Management Actions
  addInventoryAI: (name, qty, category?, zone?, shelf?) => {
    let responseMessage = '';
    set((state) => {
      // Check if item exists
      const existingIndex = state.inventory.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
      let updatedInventory = [...state.inventory];
      const sku = existingIndex >= 0 ? state.inventory[existingIndex].sku : `SKU-A${Math.floor(100 + Math.random() * 899)}`;

      if (existingIndex >= 0) {
        // Increment quantity
        const item = state.inventory[existingIndex];
        const newQty = item.quantity + qty;
        updatedInventory[existingIndex] = {
          ...item,
          quantity: newQty
        };
        responseMessage = `Added ${qty} ${name} to ${item.assignedShelf}. Total: ${newQty}.`;
      } else {
        // Create new item
        const newItem: InventoryItem = {
          sku,
          name,
          category: category || 'General',
          zone: zone || 'Zone A',
          assignedShelf: shelf || 'A3',
          currentShelf: shelf || 'A3',
          status: 'verified',
          quantity: qty
        };
        updatedInventory = [newItem, ...state.inventory];
        responseMessage = `Added ${qty} ${name} to ${shelf || 'A3'}.`;
      }

      // Add activity
      const timeStr = new Date().toTimeString().split(' ')[0];
      const newActivity: ActivityEvent = {
        id: `act-${Date.now()}`,
        time: timeStr,
        message: `Inventory added: ${name} (${qty} units)`,
        type: 'success'
      };

      return {
        inventory: updatedInventory,
        activities: [newActivity, ...state.activities.slice(0, 49)]
      };
    });

    return responseMessage;
  },

  updateInventoryAI: (name, qty) => {
    let responseMessage = '';
    set((state) => {
      const idx = state.inventory.findIndex(i => i.name.toLowerCase().includes(name.toLowerCase()));
      if (idx === -1) {
        responseMessage = `Item ${name} not found in inventory registry.`;
        return {};
      }
      
      const item = state.inventory[idx];
      const updatedInventory = [...state.inventory];
      updatedInventory[idx] = {
        ...item,
        quantity: qty
      };

      const timeStr = new Date().toTimeString().split(' ')[0];
      const newActivity: ActivityEvent = {
        id: `act-${Date.now()}`,
        time: timeStr,
        message: `Stock level updated: ${item.name} set to ${qty}`,
        type: 'success'
      };

      responseMessage = `Set quantity of ${item.name} to ${qty}.`;
      return {
        inventory: updatedInventory,
        activities: [newActivity, ...state.activities.slice(0, 49)]
      };
    });
    return responseMessage;
  },

  removeInventoryAI: (name, qty) => {
    let responseMessage = '';
    set((state) => {
      const idx = state.inventory.findIndex(i => i.name.toLowerCase().includes(name.toLowerCase()));
      if (idx === -1) {
        responseMessage = `Item ${name} not found in inventory registry.`;
        return {};
      }

      const item = state.inventory[idx];
      const updatedInventory = [...state.inventory];
      const newQty = Math.max(0, item.quantity - qty);
      updatedInventory[idx] = {
        ...item,
        quantity: newQty
      };

      const timeStr = new Date().toTimeString().split(' ')[0];
      const newActivity: ActivityEvent = {
        id: `act-${Date.now()}`,
        time: timeStr,
        message: `Stock level reduced: ${item.name} (${qty} units removed)`,
        type: 'warning'
      };

      responseMessage = `Removed ${qty} ${item.name}. New quantity is ${newQty}.`;
      return {
        inventory: updatedInventory,
        activities: [newActivity, ...state.activities.slice(0, 49)]
      };
    });
    return responseMessage;
  },

  getInventorySummary: () => {
    const state = get();
    const total = state.inventory.reduce((acc, curr) => acc + curr.quantity, 0);
    const categories: Record<string, number> = {};
    state.inventory.forEach(item => {
      categories[item.category] = (categories[item.category] || 0) + item.quantity;
    });

    return {
      total,
      categories,
      itemsCount: state.inventory.length
    };
  },

  getMisplacedItems: () => {
    const state = get();
    return state.inventory.filter(item => item.status === 'error' || item.assignedShelf !== item.currentShelf);
  },

  resolveAlert: (alertId) => set((state) => {
    const alert = state.alerts.find(a => a.id === alertId);
    if (!alert) return {};

    const updatedAlerts = state.alerts.map(a => 
      a.id === alertId ? { ...a, resolved: true } : a
    ).filter(a => !a.resolved);

    const timeStr = new Date().toTimeString().split(' ')[0];
    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`,
      time: timeStr,
      message: `Shelf verified: ${alert.shelfId || 'System'}`,
      type: 'success'
    };

    let updatedShelves = { ...state.shelves };
    let updatedInventory = [...state.inventory];
    if (alert.shelfId && state.shelves[alert.shelfId]) {
      updatedShelves[alert.shelfId] = {
        ...state.shelves[alert.shelfId],
        status: 'verified'
      };

      updatedInventory = state.inventory.map(item => {
        if (item.assignedShelf === alert.shelfId) {
          return { ...item, status: 'verified', currentShelf: alert.shelfId };
        }
        return item;
      });
    }

    return {
      alerts: updatedAlerts,
      shelves: updatedShelves,
      inventory: updatedInventory,
      activities: [newActivity, ...state.activities.slice(0, 49)]
    };
  }),

  addCustomAlert: (severity, message, shelfId) => set((state) => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    const newAlert: AlertLog = {
      id: `alert-${Date.now()}`,
      timestamp: timeStr,
      severity,
      message,
      resolved: false,
      shelfId
    };

    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`,
      time: timeStr,
      message: `${severity === 'critical' ? 'Item misplaced' : 'Verification pending'}`,
      type: severity === 'critical' ? 'error' : 'warning'
    };

    return {
      alerts: [newAlert, ...state.alerts],
      activities: [newActivity, ...state.activities.slice(0, 49)]
    };
  })
}))
