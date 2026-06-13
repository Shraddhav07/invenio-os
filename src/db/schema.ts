import { pgTable, serial, varchar, integer, text, timestamp, foreignKey, unique, boolean } from "drizzle-orm/pg-core";

// Products table with ArUco marker tracking
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  zone: varchar("zone", { length: 100 }).notNull(),
  assignedShelf: varchar("assigned_shelf", { length: 20 }).notNull(),
  currentShelf: varchar("current_shelf", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("verified"),
  quantity: integer("quantity").notNull().default(0),
  arUcoMarkerId: integer("aruco_marker_id").unique(), // Unique ArUco ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Camera devices
export const cameras = pgTable("cameras", {
  id: serial("id").primaryKey(),
  deviceId: varchar("device_id", { length: 50 }).notNull().unique(), // "0", "1", etc
  name: varchar("name", { length: 100 }).notNull(),
  location: varchar("location", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shelf definitions with camera context
export const shelves = pgTable("shelves", {
  id: serial("id").primaryKey(),
  arUcoMarkerId: integer("aruco_marker_id").notNull().unique(), // Shelf anchor marker
  cameraId: integer("camera_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  zone: varchar("zone", { length: 100 }).notNull(),
  polygon: text("polygon").notNull(), // JSON: relative coords [{x,y}...]
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  cameraFk: foreignKey({ columns: [table.cameraId], foreignColumns: [cameras.id] }),
}));

// Real-time camera-product detections
export const detections = pgTable("detections", {
  id: serial("id").primaryKey(),
  cameraId: integer("camera_id").notNull(),
  productId: integer("product_id"),
  arUcoMarkerId: integer("aruco_marker_id").notNull(),
  shelfId: integer("shelf_id"),
  x: integer("x"), // Pixel position in camera frame
  y: integer("y"),
  confidence: varchar("confidence", { length: 20 }).default("detected"),
  status: varchar("status", { length: 20 }).notNull().default("in_transit"), // "in_transit" | "placed" | "misplaced"
  detectedAt: timestamp("detected_at").defaultNow(),
}, (table) => ({
  cameraFk: foreignKey({ columns: [table.cameraId], foreignColumns: [cameras.id] }),
  productFk: foreignKey({ columns: [table.productId], foreignColumns: [products.id] }),
  shelfFk: foreignKey({ columns: [table.shelfId], foreignColumns: [shelves.id] }),
}));

// ArUco marker registry
export const arUcoMarkers = pgTable("aruco_markers", {
  id: serial("id").primaryKey(),
  markerId: integer("marker_id").notNull().unique(),
  type: varchar("type", { length: 20 }).notNull(), // "product" | "shelf"
  linkedProductId: integer("linked_product_id"),
  linkedShelfId: integer("linked_shelf_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  productFk: foreignKey({ columns: [table.linkedProductId], foreignColumns: [products.id] }),
  shelfFk: foreignKey({ columns: [table.linkedShelfId], foreignColumns: [shelves.id] }),
}));

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Camera = typeof cameras.$inferSelect;
export type Shelf = typeof shelves.$inferSelect;
export type Detection = typeof detections.$inferSelect;
export type ArUcoMarker = typeof arUcoMarkers.$inferSelect;
