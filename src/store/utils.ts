import type { Shelf } from "./types";

export const getNearestAisleX = (x: number): number => {
  const lanes = [-10, -6, -2, 2, 6, 10];
  let nearest = lanes[0];
  let minDist = Math.abs(x - nearest);
  for (const lane of lanes) {
    const dist = Math.abs(x - lane);
    if (dist < minDist) {
      minDist = dist;
      nearest = lane;
    }
  }
  return nearest;
};

export const getAisleSafePath = (
  start: [number, number, number],
  end: [number, number, number],
): [number, number, number][] => {
  const x1 = start[0];
  const z1 = start[2];
  const x2 = end[0];
  const z2 = end[2];
  const y = start[1];

  const path: [number, number, number][] = [];
  path.push([x1, y, z1]);

  if (Math.abs(x1 - x2) < 0.1 && Math.abs(z1 - z2) < 0.1) return path;

  const startAisleX = getNearestAisleX(x1);
  const endAisleX = getNearestAisleX(x2);

  let corrZ = 5;
  if (z1 > 5 || z2 > 5) {
    corrZ = 5;
  } else if (z1 < -5 || z2 < -5) {
    corrZ = -5;
  } else {
    corrZ = Math.abs(z1 - 5) < Math.abs(z1 - -5) ? 5 : -5;
  }

  if (Math.abs(x1 - startAisleX) > 0.1) path.push([startAisleX, y, z1]);
  if (Math.abs(z1 - corrZ) > 0.1) path.push([startAisleX, y, corrZ]);
  if (Math.abs(startAisleX - endAisleX) > 0.1) path.push([endAisleX, y, corrZ]);
  if (Math.abs(corrZ - z2) > 0.1) path.push([endAisleX, y, z2]);
  if (Math.abs(endAisleX - x2) > 0.1) path.push([x2, y, z2]);

  return path;
};

export const getShelfCapacity = (shelfId: string): number => {
  if (shelfId.startsWith("A")) return 2500;
  if (shelfId.startsWith("F")) return 3000;
  if (shelfId.startsWith("B3")) return 18000;
  if (shelfId.startsWith("B2")) return 150;
  if (shelfId.startsWith("B1")) return 1200;
  if (shelfId.startsWith("C")) return 1000;
  if (shelfId.startsWith("H")) return 800;
  return 1000;
};

export const getRecommendedZones = (category: string): string[] => {
  const cat = category.toLowerCase().trim();
  if (["electronics", "furniture", "industrial"].includes(cat))
    return ["Zone A"];
  if (["food", "cleaning supplies", "cleaning", "medical"].includes(cat))
    return ["Zone B"];
  if (["beverages", "beverage", "general merchandise"].includes(cat))
    return ["Zone C"];
  if (
    ["hazardous", "hazardous materials", "batteries", "chemicals"].includes(cat)
  )
    return ["Hazard Storage"];
  if (
    [
      "refrigerated medical",
      "perishable goods",
      "perishables",
      "cold storage",
    ].includes(cat)
  )
    return ["Cold Storage"];
  return ["Zone A", "Zone B", "Zone C"];
};

export const getRecommendedShelves = (category: string): string[] => {
  const cat = category.toLowerCase().trim();
  if (["electronics", "furniture", "industrial"].includes(cat))
    return ["A1", "A2", "A3"];
  if (["food", "cleaning supplies", "cleaning", "medical"].includes(cat))
    return ["B1", "B2", "B3"];
  if (["beverages", "beverage", "general merchandise"].includes(cat))
    return ["C1", "C2", "C3"];
  if (
    ["hazardous", "hazardous materials", "batteries", "chemicals"].includes(cat)
  )
    return ["H1", "H2"];
  if (
    [
      "refrigerated medical",
      "perishable goods",
      "perishables",
      "cold storage",
    ].includes(cat)
  )
    return ["F1", "F2"];
  return [
    "A1",
    "A2",
    "A3",
    "B1",
    "B2",
    "B3",
    "C1",
    "C2",
    "C3",
    "H1",
    "H2",
    "F1",
    "F2",
  ];
};

export const isShelfAllowedForCategory = (
  category: string,
  shelfId: string,
  _shelves?: Record<string, Shelf>,
): boolean => {
  if (shelfId === "REC") return true;
  const allowedShelves = getRecommendedShelves(category);
  return allowedShelves.includes(shelfId);
};

export const syncWarehouseState = (state: any) => {
  const updatedShelves = { ...state.shelves };
  const updatedInventory = [...state.inventory];
  let updatedAlerts = [...state.alerts];

  Object.keys(updatedShelves).forEach((shelfId) => {
    const shelf = updatedShelves[shelfId];
    if (shelfId === "REC") {
      updatedShelves[shelfId] = { ...shelf, status: "pending" };
      return;
    }

    const itemsOnShelf = updatedInventory.filter(
      (item) => item.currentShelf === shelfId,
    );
    const hasMisplaced = itemsOnShelf.some(
      (item) => item.assignedShelf !== shelfId && item.currentShelf !== "REC",
    );
    const hasCategoryViolation = itemsOnShelf.some(
      (item) =>
        !isShelfAllowedForCategory(item.category, shelfId, updatedShelves),
    );

    if (hasMisplaced || hasCategoryViolation) {
      updatedShelves[shelfId] = { ...shelf, status: "error" };
    } else if (shelf.status === "error") {
      updatedShelves[shelfId] = { ...shelf, status: "verified" };
    }
  });

  updatedAlerts = updatedAlerts.filter((alert) => {
    if (
      alert.message.includes("ESP32") ||
      alert.message.includes("Device Status") ||
      alert.message.includes("nearing capacity") ||
      alert.message.includes("Receiving Area Full")
    ) {
      return true;
    }
    if (alert.severity === "critical") {
      const item = updatedInventory.find((i) => alert.message.includes(i.name));
      if (!item) return false;
      const isMisplaced = item.currentShelf !== item.assignedShelf;
      const isInvalidZone = !isShelfAllowedForCategory(
        item.category,
        item.currentShelf,
        updatedShelves,
      );
      return isMisplaced || isInvalidZone;
    }
    return true;
  });

  updatedInventory.forEach((item) => {
    if (item.currentShelf === "REC") {
      item.status = "pending";
      return;
    }

    const isMisplaced = item.currentShelf !== item.assignedShelf;
    const isInvalidZone = !isShelfAllowedForCategory(
      item.category,
      item.currentShelf,
      updatedShelves,
    );

    if (isMisplaced || isInvalidZone) {
      item.status = "error";
      const expectedZones = getRecommendedZones(item.category).join(", ");
      const currentZone =
        updatedShelves[item.currentShelf]?.zone || item.currentShelf;
      const alertMsg = isInvalidZone
        ? `${item.name} stored in ${currentZone}. Expected: ${expectedZones}. Status: Misplaced`
        : `${item.name} misplaced on shelf ${item.currentShelf} instead of assigned ${item.assignedShelf}. Expected: ${updatedShelves[item.assignedShelf]?.zone || "Correct Zone"}. Status: Misplaced`;

      const alertExists = updatedAlerts.some(
        (a) => a.message === alertMsg && !a.resolved,
      );
      if (!alertExists) {
        updatedAlerts.unshift({
          id: `alert-${Date.now()}-${item.sku}`,
          timestamp: new Date().toTimeString().split(" ")[0],
          severity: "critical",
          message: alertMsg,
          resolved: false,
          shelfId: item.currentShelf,
        });
      }
    } else {
      item.status = "verified";
    }
  });

  const itemsOnRec = updatedInventory.filter((i) => i.currentShelf === "REC");
  const usedSlots = itemsOnRec.reduce(
    (acc, curr) => acc + Math.ceil(curr.quantity / 10),
    0,
  );

  updatedAlerts = updatedAlerts.filter(
    (alert) =>
      !(
        alert.message.includes("Receiving Area nearing capacity") ||
        alert.message.includes("Receiving Area Full")
      ),
  );

  if (usedSlots >= 20) {
    updatedAlerts.unshift({
      id: `alert-rec-full-${Date.now()}`,
      timestamp: new Date().toTimeString().split(" ")[0],
      severity: "critical",
      message: `Receiving Area Full: ${usedSlots}/20 slots occupied. Relocate inventory now.`,
      resolved: false,
      shelfId: "REC",
    });
  } else if (usedSlots >= 15) {
    updatedAlerts.unshift({
      id: `alert-rec-near-${Date.now()}`,
      timestamp: new Date().toTimeString().split(" ")[0],
      severity: "warning",
      message: `Receiving Area nearing capacity: ${usedSlots}/20 slots occupied.`,
      resolved: false,
      shelfId: "REC",
    });
  }

  return { shelves: updatedShelves, alerts: updatedAlerts };
};
