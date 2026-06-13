import { seedProducts } from "./seed.ts";
import type { Product } from "./schema.ts";
import type { InventoryItem } from "../store/types.ts";

export function productToInventoryItem(product: Product): InventoryItem {
  return {
    sku: product.sku,
    name: product.name,
    category: product.category,
    zone: product.zone,
    assignedShelf: product.assignedShelf,
    currentShelf: product.currentShelf,
    status: product.status as any,
    quantity: product.quantity,
  };
}

export function seedDataToInventoryItems(): InventoryItem[] {
  return seedProducts.map((product) => ({
    sku: product.sku,
    name: product.name,
    category: product.category,
    zone: product.zone,
    assignedShelf: product.assignedShelf,
    currentShelf: product.currentShelf,
    status: product.status as any,
    quantity: product.quantity,
  }));
}
