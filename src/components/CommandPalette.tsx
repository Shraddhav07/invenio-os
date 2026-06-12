import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Terminal,
  Database,
  ShieldAlert,
  Settings,
  LayoutDashboard,
  Map,
  List,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import { useInvenioStore } from "../store/store";
import type { PageRoute } from "../store/types";
interface CommandItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  action: () => void;
  category: "Navigation" | "Actions" | "Utilities";
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLocateMode, setIsLocateMode] = useState(false);

  const paletteRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setRoute, inventory, locateItem, addCustomAlert } = useInvenioStore();

  // Listen to keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
        setSearch("");
        setIsLocateMode(false);
        setActiveIndex(0);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset active index when search changes
  useEffect(() => {
    setActiveIndex(0);
  }, [search, isLocateMode]);

  const navigateTo = (route: PageRoute) => {
    setRoute(route);
    setIsOpen(false);
  };

  // Base Commands (Dark mode only, no theme toggler)
  const baseCommands: CommandItem[] = [
    {
      icon: LayoutDashboard,
      label: "Open Dashboard",
      shortcut: "G D",
      action: () => navigateTo("dashboard"),
      category: "Navigation",
    },
    {
      icon: Map,
      label: "Open Digital Twin Viewport",
      shortcut: "G T",
      action: () => navigateTo("twin"),
      category: "Navigation",
    },
    {
      icon: List,
      label: "Open Inventory Registry",
      shortcut: "G I",
      action: () => navigateTo("inventory"),
      category: "Navigation",
    },
    {
      icon: HelpCircle,
      label: "Open AI Assistant Terminal",
      shortcut: "G A",
      action: () => navigateTo("assistant"),
      category: "Navigation",
    },
    {
      icon: ShieldAlert,
      label: "Open Alerts incident logs",
      shortcut: "G E",
      action: () => navigateTo("alerts"),
      category: "Navigation",
    },
    {
      icon: Terminal,
      label: "Open Mission Control",
      shortcut: "G M",
      action: () => navigateTo("simulator"),
      category: "Navigation",
    },
    {
      icon: Database,
      label: "Locate Inventory Item...",
      shortcut: "F I",
      action: () => {
        setIsLocateMode(true);
        setSearch("");
      },
      category: "Actions",
    },
  ];

  const getFilteredItems = (): { item: any; isItem: boolean }[] => {
    if (isLocateMode) {
      return inventory
        .filter(
          (item) =>
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.sku.toLowerCase().includes(search.toLowerCase()),
        )
        .map((item) => ({ item, isItem: true }));
    }

    return baseCommands
      .filter((cmd) => cmd.label.toLowerCase().includes(search.toLowerCase()))
      .map((cmd) => ({ item: cmd, isItem: false }));
  };

  const filtered = getFilteredItems();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) {
        executeSelection(filtered[activeIndex]);
      }
    } else if (e.key === "Backspace" && search === "" && isLocateMode) {
      e.preventDefault();
      setIsLocateMode(false);
    }
  };

  const executeSelection = (selected: { item: any; isItem: boolean }) => {
    if (selected.isItem) {
      const success = locateItem(selected.item.name);
      if (success) {
        setRoute("twin");
        setIsOpen(false);
        setIsLocateMode(false);
      }
    } else {
      selected.item.action();
    }
  };

  // Click outside close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        paletteRef.current &&
        !paletteRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/70">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            ref={paletteRef}
            className="w-full max-w-xl overflow-hidden bg-[#121317] rounded-xl shadow-2xl border border-[#22252C]"
            onKeyDown={handleKeyDown}
          >
            {/* Search Input Box */}
            <div className="flex items-center px-4 py-3.5 border-b border-[#22252C]">
              <Search className="w-5 h-5 mr-3 text-zinc-500" />
              {isLocateMode && (
                <span className="px-2 py-0.5 mr-2 text-[10px] font-semibold rounded bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30">
                  Locate
                </span>
              )}
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  isLocateMode
                    ? "Search inventory item by name or SKU..."
                    : "Type a command or search..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-white placeholder-zinc-500 text-xs focus:ring-0"
              />
              <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-[#22252C]">
                ESC
              </span>
            </div>

            {/* List area */}
            <div className="max-h-80 overflow-y-auto p-2 bg-[#121317]">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No matches found for "{search}"
                </div>
              ) : (
                <div>
                  {!isLocateMode && (
                    <div className="px-2 py-1 text-[9px] uppercase tracking-wider font-semibold text-[#A1A1AA]">
                      Commands
                    </div>
                  )}
                  {isLocateMode && (
                    <div className="px-2 py-1 text-[9px] uppercase tracking-wider font-semibold text-[#FF6B35]">
                      Inventory Catalog
                    </div>
                  )}

                  <div className="mt-1 space-y-0.5">
                    {filtered.map((el, index) => {
                      const active = index === activeIndex;
                      if (el.isItem) {
                        const item = el.item;
                        return (
                          <div
                            key={item.sku}
                            onClick={() => executeSelection(el)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                              active
                                ? "bg-[#FF6B35]/15 border border-[#FF6B35]/30 text-white"
                                : "hover:bg-[#171A20] text-zinc-400 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center">
                              <Database
                                className={`w-4 h-4 mr-3 ${active ? "text-[#FF6B35]" : "text-zinc-550"}`}
                              />
                              <div>
                                <span
                                  className={`text-xs font-medium ${active ? "text-white" : "text-[#A1A1AA]"}`}
                                >
                                  {item.name}
                                </span>
                                <span className="text-[10px] text-zinc-500 ml-2 font-mono">
                                  {item.sku}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded bg-[#171A20] text-zinc-400">
                                {item.zone}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                Shelf {item.assignedShelf}
                              </span>
                            </div>
                          </div>
                        );
                      } else {
                        const cmd = el.item;
                        const Icon = cmd.icon;
                        return (
                          <div
                            key={cmd.label}
                            onClick={() => executeSelection(el)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                              active
                                ? "bg-[#171A20] border border-[#22252C] text-white"
                                : "hover:bg-[#171A20]/40 text-zinc-400 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center">
                              <Icon
                                className={`w-4 h-4 mr-3 ${active ? "text-white" : "text-zinc-500"}`}
                              />
                              <span
                                className={`text-xs font-medium ${active ? "text-white" : "text-[#A1A1AA]"}`}
                              >
                                {cmd.label}
                              </span>
                            </div>
                            {cmd.shortcut && (
                              <span className="text-[10px] font-semibold font-mono text-zinc-650 tracking-wider">
                                {cmd.shortcut}
                              </span>
                            )}
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer tips */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-[#22252C] bg-[#0B0B0D] text-[9px] text-zinc-500">
              <div className="flex items-center space-x-2">
                <span>Navigate:</span>
                <span className="bg-[#121317] px-1 py-0.5 rounded border border-[#22252C]">
                  ↑↓
                </span>
                <span>Select:</span>
                <span className="bg-[#121317] px-1 py-0.5 rounded border border-[#22252C]">
                  Enter
                </span>
              </div>
              {isLocateMode && (
                <div>
                  <span>
                    Press{" "}
                    <span className="bg-[#121317] px-1 py-0.5 rounded border border-[#22252C] font-mono">
                      Backspace
                    </span>{" "}
                    to go back
                  </span>
                </div>
              )}
              {!isLocateMode && (
                <div>
                  <span>
                    Press{" "}
                    <span className="bg-[#121317] px-1 py-0.5 rounded border border-[#22252C] font-mono">
                      Ctrl+K
                    </span>{" "}
                    to close
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
