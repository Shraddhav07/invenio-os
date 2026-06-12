import React, { useState } from "react";
import {
  Search,
  Plus,
  Navigation,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Shield,
  MapPin,
} from "lucide-react";
import { useInvenioStore } from "../store/store";
import { isShelfAllowedForCategory, getRecommendedZones } from "../store/utils";
import type { InventoryItem } from "../store/types";
export const InventoryView: React.FC = () => {
  const { inventory, locateItem, simulateNewArrival, shelves } =
    useInvenioStore();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [shelfFilter, setShelfFilter] = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);

  // Custom Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Beverages");
  const [zone, setZone] = useState("Zone C");
  const [shelf, setShelf] = useState("C1");
  const [qty, setQty] = useState(100);

  // AI Semantic Query & Category/Shelf matching
  const getFilteredInventory = () => {
    let items = inventory;

    if (categoryFilter !== "All") {
      items = items.filter((item) => item.category === categoryFilter);
    }
    if (shelfFilter !== "All") {
      items = items.filter(
        (item) =>
          item.currentShelf === shelfFilter ||
          item.assignedShelf === shelfFilter,
      );
    }

    const query = search.toLowerCase().trim();
    if (!query) return items;

    // Semantic trigger: misplaced
    if (
      query === "misplaced" ||
      query === "error" ||
      query === "wrong placement" ||
      query === "anomaly"
    ) {
      return items.filter(
        (item) =>
          item.status === "error" || item.assignedShelf !== item.currentShelf,
      );
    }

    // Semantic trigger: categories or terms
    if (
      [
        "beverages",
        "food",
        "electronics",
        "furniture",
        "industrial",
        "medical",
        "cleaning",
        "hazardous",
      ].some((cat) => query.includes(cat))
    ) {
      return items.filter(
        (item) =>
          item.category.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query),
      );
    }

    // Standard filter
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.assignedShelf.toLowerCase().includes(query),
    );
  };

  const filteredItems = getFilteredInventory();

  // Handle zone auto-mapping based on selected shelf
  const handleShelfChange = (selectedShelf: string) => {
    setShelf(selectedShelf);
    if (selectedShelf.startsWith("A")) setZone("Zone A");
    else if (selectedShelf.startsWith("B")) setZone("Zone B");
    else if (selectedShelf.startsWith("C")) setZone("Zone C");
    else if (selectedShelf.startsWith("H")) setZone("Hazard Storage");
    else if (selectedShelf.startsWith("F")) setZone("Cold Storage");
    else setZone("Receiving Area");
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    useInvenioStore.setState((state) => {
      const sku = `SKU-${Math.floor(1000 + Math.random() * 8999)}`;
      const newItem: InventoryItem = {
        sku,
        name,
        category,
        zone,
        assignedShelf: shelf,
        currentShelf: shelf,
        status: "verified",
        quantity: qty,
      };
      return {
        inventory: [newItem, ...state.inventory],
        activities: [
          {
            id: `act-${Date.now()}`,
            time: new Date().toTimeString().split(" ")[0],
            message: `Inventory added: ${name} (${qty} units)`,
            type: "success",
          },
          ...state.activities,
        ],
      };
    });

    // Reset form
    setName("");
    setQty(100);
    setShowAddForm(false);
  };

  const allowedForForm = isShelfAllowedForCategory(category, shelf, shelves);
  const suggestedForForm = getRecommendedZones(category);

  return (
    <div className="w-full h-full p-6 flex flex-col space-y-6 overflow-y-auto bg-[#0B0B0D] text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white m-0">
            Inventory Registry
          </h2>
          <p className="text-[10px] text-[#A1A1AA] mt-1 uppercase tracking-widest">
            Search, filter, and allocate physical inventory units
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={simulateNewArrival}
            className="px-3.5 py-1.5 rounded-lg bg-[#121317] hover:bg-[#171A20] text-xs font-semibold text-zinc-300 border border-[#22252C] transition-colors"
          >
            Simulate Arrival
          </button>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-[#FF6B35] hover:bg-[#E05626] text-xs font-semibold text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Semantic Search Box & Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 bg-[#121317] rounded-xl border border-[#22252C] items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Semantic Search (e.g., 'misplaced', 'electronics', 'Sprite Bottles')..."
            className="flex-1 bg-transparent border-none outline-none text-xs placeholder-zinc-500 focus:ring-0"
          />
          <div className="hidden sm:flex items-center space-x-1 px-2 py-0.5 rounded bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20 text-[9px] font-mono font-bold uppercase tracking-wider">
            <HelpCircle className="w-2.5 h-2.5 mr-0.5" />
            AI Search Mode
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full lg:w-auto border-t lg:border-t-0 border-[#22252C] pt-3 lg:pt-0">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#171A20] border border-[#22252C] rounded px-3 py-1.5 text-xs text-white outline-none focus:border-[#FF6B35] w-full sm:w-40"
          >
            <option value="All">All Categories</option>
            <option value="Beverages">Beverages</option>
            <option value="Food">Food</option>
            <option value="Electronics">Electronics</option>
            <option value="Furniture">Furniture</option>
            <option value="Industrial">Industrial</option>
            <option value="Medical">Medical</option>
            <option value="Cleaning Supplies">Cleaning Supplies</option>
            <option value="Hazardous">Hazardous</option>
          </select>

          <select
            value={shelfFilter}
            onChange={(e) => setShelfFilter(e.target.value)}
            className="bg-[#171A20] border border-[#22252C] rounded px-3 py-1.5 text-xs text-white outline-none focus:border-[#FF6B35] w-full sm:w-40"
          >
            <option value="All">All Shelves</option>
            <option value="REC">Receiving Area (REC)</option>
            <option value="A1">Shelf A1</option>
            <option value="A2">Shelf A2</option>
            <option value="A3">Shelf A3</option>
            <option value="B1">Shelf B1</option>
            <option value="B2">Shelf B2</option>
            <option value="B3">Shelf B3</option>
            <option value="C1">Shelf C1</option>
            <option value="C2">Shelf C2</option>
            <option value="C3">Shelf C3</option>
            <option value="H1">Shelf H1</option>
            <option value="H2">Shelf H2</option>
            <option value="F1">Shelf F1</option>
            <option value="F2">Shelf F2</option>
          </select>
        </div>
      </div>

      {/* Main Grid layout split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Table (9 cols) */}
        <div className="lg:col-span-9 flex flex-col space-y-6">
          <div className="bg-[#121317] rounded-xl border border-[#22252C] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#22252C] bg-[#171A20] text-[#A1A1AA] font-semibold tracking-wider uppercase">
                    <th className="p-4 text-[10px]">SKU Code</th>
                    <th className="p-4 text-[10px]">Item Name</th>
                    <th className="p-4 text-[10px]">Category</th>
                    <th className="p-4 text-[10px]">Quantity</th>
                    <th className="p-4 text-[10px]">
                      Location (Assigned / Scanned)
                    </th>
                    <th className="p-4 text-[10px]">Status</th>
                    <th className="p-4 text-[10px] text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#22252C] font-medium bg-[#121317]">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-8 text-center text-[#A1A1AA] text-xs"
                      >
                        No matching inventory SKUs found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isMisplaced =
                        item.assignedShelf !== item.currentShelf &&
                        item.status === "error";
                      const isNotAllowed = !isShelfAllowedForCategory(
                        item.category,
                        item.currentShelf,
                        shelves,
                      );
                      return (
                        <tr
                          key={item.sku}
                          className={`hover:bg-[#171A20]/40 transition-colors ${
                            isMisplaced || isNotAllowed ? "bg-[#EF4444]/5" : ""
                          }`}
                        >
                          <td className="p-4 font-mono text-[10px] text-[#A1A1AA]">
                            {item.sku}
                          </td>

                          <td className="p-4 text-white font-semibold">
                            {item.name}
                          </td>

                          <td className="p-4">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#171A20] text-[#A1A1AA] border border-[#22252C]">
                              {item.category}
                            </span>
                          </td>

                          <td className="p-4 font-mono text-white">
                            {item.quantity}
                          </td>

                          <td className="p-4 font-mono text-[10px]">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-zinc-400">
                                {item.assignedShelf}
                              </span>
                              <span className="text-zinc-600">→</span>
                              <span
                                className={
                                  isMisplaced || isNotAllowed
                                    ? "text-[#EF4444] font-bold"
                                    : "text-zinc-500"
                                }
                              >
                                {item.currentShelf}
                              </span>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center space-x-1.5">
                              {item.status === "verified" && !isNotAllowed && (
                                <>
                                  <CheckCircle className="w-4 h-4 text-[#22C55E]" />
                                  <span className="text-[#22C55E] text-[10px]">
                                    Verified
                                  </span>
                                </>
                              )}
                              {item.status === "pending" && (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                                  <span className="text-[#F59E0B] text-[10px]">
                                    Pending
                                  </span>
                                </>
                              )}
                              {(item.status === "error" || isNotAllowed) && (
                                <>
                                  <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                                  <span className="text-[#EF4444] text-[10px] font-semibold">
                                    {isNotAllowed ? "Zone Error" : "Misplaced"}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="p-4 text-right">
                            <button
                              onClick={() => locateItem(item.name)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#FF6B35]/10 hover:bg-[#FF6B35]/25 text-[#FF6B35] border border-[#FF6B35]/20 transition-all text-[10px]"
                            >
                              <Navigation className="w-3 h-3" />
                              <span className="font-semibold uppercase">
                                Locate
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Category-to-Zone Allocations Guide (3 cols) */}
        <div className="lg:col-span-3 flex flex-col space-y-6">
          <div className="bg-[#121317] p-5 rounded-xl border border-[#22252C] flex flex-col space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#22252C]">
              <Shield className="w-4.5 h-4.5 text-[#FF6B35]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Zone Safety Directives
              </h3>
            </div>

            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Strict rules guide the shelf mapping of inventory items by
              category to satisfy hazard containment and cooling directives:
            </p>

            <div className="space-y-3 pt-1">
              <div className="p-2.5 bg-[#171A20] border border-[#22252C] rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#FF6B35] uppercase">
                    Zone A (General)
                  </span>
                  <span className="text-[9px] font-mono text-[#A1A1AA]">
                    A1-A3
                  </span>
                </div>
                <span className="text-[9px] text-zinc-400 block mt-1">
                  Allowed: Electronics, Furniture, Industrial
                </span>
              </div>

              <div className="p-2.5 bg-[#171A20] border border-[#22252C] rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#FF6B35] uppercase">
                    Zone B (Ambient)
                  </span>
                  <span className="text-[9px] font-mono text-[#A1A1AA]">
                    B1-B3
                  </span>
                </div>
                <span className="text-[9px] text-zinc-400 block mt-1">
                  Allowed: Food, Cleaning Supplies, Medical
                </span>
              </div>

              <div className="p-2.5 bg-[#171A20] border border-[#22252C] rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#FF6B35] uppercase">
                    Zone C (High-Qty)
                  </span>
                  <span className="text-[9px] font-mono text-[#A1A1AA]">
                    C1-C3
                  </span>
                </div>
                <span className="text-[9px] text-zinc-400 block mt-1">
                  Allowed: Beverages, General Merch
                </span>
              </div>

              <div className="p-2.5 bg-[#171A20] border border-[#22252C] rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-red-400 uppercase">
                    Hazardous Storage
                  </span>
                  <span className="text-[9px] font-mono text-[#A1A1AA]">
                    H1-H2
                  </span>
                </div>
                <span className="text-[9px] text-zinc-400 block mt-1">
                  Allowed: Hazardous chemicals, batteries
                </span>
              </div>

              <div className="p-2.5 bg-[#171A20] border border-[#22252C] rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sky-400 uppercase">
                    Cold Storage
                  </span>
                  <span className="text-[9px] font-mono text-[#A1A1AA]">
                    F1-F2
                  </span>
                </div>
                <span className="text-[9px] text-zinc-400 block mt-1">
                  Allowed: Refrigerated medical, perishables
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Adding inventory form overlay modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md bg-[#121317] p-6 rounded-xl border border-[#22252C] shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-[#22252C]">
              <MapPin className="w-4 h-4 text-[#FF6B35]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider m-0">
                Register Catalog SKU
              </h3>
            </div>

            <form
              onSubmit={handleAddNewItem}
              className="space-y-4 text-xs text-[#A1A1AA]"
            >
              <div className="flex flex-col space-y-1">
                <label className="text-zinc-400">Item Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Sprite Bottles"
                  className="bg-[#171A20] border border-[#22252C] rounded px-3 py-2 text-white outline-none focus:border-[#FF6B35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-zinc-400">Category</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                    }}
                    className="bg-[#171A20] border border-[#22252C] rounded px-3 py-2 text-white outline-none focus:border-[#FF6B35]"
                  >
                    <option value="Beverages">Beverages</option>
                    <option value="Food">Food</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Medical">Medical</option>
                    <option value="Cleaning Supplies">Cleaning Supplies</option>
                    <option value="Hazardous">Hazardous</option>
                  </select>
                  <span className="text-[9px] text-[#FF6B35] mt-1 font-mono leading-none">
                    Recommended: {suggestedForForm.join(", ")}
                  </span>
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-zinc-400">Assigned Shelf</label>
                  <select
                    value={shelf}
                    onChange={(e) => handleShelfChange(e.target.value)}
                    className="bg-[#171A20] border border-[#22252C] rounded px-3 py-2 text-white outline-none focus:border-[#FF6B35]"
                  >
                    <option value="A1">Shelf A1 (Zone A)</option>
                    <option value="A2">Shelf A2 (Zone A)</option>
                    <option value="A3">Shelf A3 (Zone A)</option>
                    <option value="B1">Shelf B1 (Zone B)</option>
                    <option value="B2">Shelf B2 (Zone B)</option>
                    <option value="B3">Shelf B3 (Zone B)</option>
                    <option value="C1">Shelf C1 (Zone C)</option>
                    <option value="C2">Shelf C2 (Zone C)</option>
                    <option value="C3">Shelf C3 (Zone C)</option>
                    <option value="H1">Shelf H1 (Hazardous)</option>
                    <option value="H2">Shelf H2 (Hazardous)</option>
                    <option value="F1">Shelf F1 (Cold Storage)</option>
                    <option value="F2">Shelf F2 (Cold Storage)</option>
                  </select>
                  {!allowedForForm && (
                    <span className="text-[8px] text-[#EF4444] font-bold mt-1 uppercase animate-pulse">
                      ⚠️ Rule Violation Detected
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-zinc-400">Quantity</label>
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                    required
                    className="bg-[#171A20] border border-[#22252C] rounded px-3 py-2 text-white outline-none focus:border-[#FF6B35]"
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-zinc-400 font-medium">
                    Zone Allocation
                  </label>
                  <input
                    type="text"
                    value={zone}
                    disabled
                    className="bg-[#0B0B0D] border border-[#22252C] rounded px-3 py-2 text-zinc-500 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Warning box if violated */}
              {!allowedForForm && (
                <div className="p-2.5 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded text-[9px] text-[#EF4444] leading-relaxed">
                  <strong>Warning:</strong> Placing "{category}" on shelf "
                  {shelf}" violates strict container safety directives. Please
                  choose a shelf in:{" "}
                  <strong>{suggestedForForm.join(", ")}</strong>.
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#22252C]/60">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded bg-[#171A20] hover:bg-[#22252C] text-[#A1A1AA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-[#FF6B35] text-white font-bold hover:bg-[#E05626]"
                >
                  Confirm SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
