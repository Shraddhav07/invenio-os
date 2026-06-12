import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  BrainCircuit,
  Terminal,
  Sparkles,
  AlertTriangle,
  User,
} from "lucide-react";
import { useInvenioStore } from "../store/store";
import "dotenv";
interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  customContent?: React.ReactNode;
}

const getCategoryFromShelf = (shelfId: string): string => {
  if (["C1", "C2", "C3"].includes(shelfId)) return "Beverages";
  if (shelfId === "B1") return "Food";
  if (shelfId === "B2") return "Furniture";
  if (shelfId === "B3") return "Industrial";
  if (["A1", "A2", "A3"].includes(shelfId)) return "Electronics";
  if (["H1", "H2"].includes(shelfId)) return "Hazardous";
  if (shelfId === "F1") return "Medical";
  if (shelfId === "F2") return "Cleaning Supplies";
  return "General";
};

const getZoneFromShelf = (shelfId: string): string => {
  if (["C1", "C2", "C3"].includes(shelfId)) return "Zone C";
  if (["B1", "B2", "B3"].includes(shelfId)) return "Zone B";
  if (["A1", "A2", "A3"].includes(shelfId)) return "Zone A";
  if (["H1", "H2"].includes(shelfId)) return "Hazard Storage";
  if (["F1", "F2"].includes(shelfId)) return "Cold Storage";
  return "Zone A";
};

const getAisleFromShelf = (shelfId: string): string => {
  if (["A1", "A2", "A3"].includes(shelfId)) return "Aisle 2";
  if (["B1", "B2", "B3"].includes(shelfId)) return "Aisle 3";
  if (["C1", "C2", "C3"].includes(shelfId)) return "Aisle 4";
  if (["H1", "H2"].includes(shelfId)) return "Aisle 5";
  if (["F1", "F2"].includes(shelfId)) return "Aisle 6";
  return "Aisle 1";
};

const getDefaultShelfForZone = (zoneName: string): string => {
  const zn = zoneName.toLowerCase();
  if (zn.includes("zone a")) return "A1";
  if (zn.includes("zone b")) return "B1";
  if (zn.includes("zone c")) return "C1";
  if (zn.includes("hazard")) return "H1";
  if (zn.includes("cold")) return "F1";
  return "A1";
};

export const AIAssistantView: React.FC = () => {
  const {
    inventory,
    locateItem,
    recommendations,
    alerts,
    setRoute,
    addInventoryAI,
    updateInventoryAI,
    removeInventoryAI,
    workers,
    setFollowingWorkerId,
  } = useInvenioStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingLogs, setThinkingLogs] = useState<string[]>([]);
  const [showFailoverWarning, setShowFailoverWarning] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<Record<string, string>>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, thinkingLogs]);

  const addMessage = (
    sender: "user" | "assistant",
    text: string,
    customContent?: React.ReactNode,
  ) => {
    const time = new Date().toTimeString().split(" ")[0];
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}`, sender, text, timestamp: time, customContent },
    ]);
  };

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsThinking(false);
    addMessage("assistant", "Request cancelled by user.");
  };

  const triggerFailover = (queryText: string, reason: string) => {
    console.warn(`AI failover for "${queryText}": ${reason}`);
    setShowFailoverWarning(true);
    setIsThinking(false);

    const totalItems = inventory.reduce((acc, curr) => acc + curr.quantity, 0);
    const misplaced = inventory.filter(
      (item) =>
        item.status === "error" || item.assignedShelf !== item.currentShelf,
    );
    const activeAlerts = alerts.filter((a) => !a.resolved).length;

    let localResponse = `Advanced AI temporarily unavailable. Using local warehouse intelligence. Here is a local real-time operational summary:\n\n`;
    localResponse += `• Total Registry Count: ${totalItems.toLocaleString()} units\n`;
    localResponse += `• Critical Alerts: ${activeAlerts}\n`;
    localResponse += `• Verified Items: ${inventory.filter((i) => i.status === "verified").length}\n`;
    localResponse += `• Inventory Accuracy: ${inventory.length > 0 ? ((1 - misplaced.length / inventory.length) * 100).toFixed(1) : "100"}%\n\n`;
    localResponse += `⚠️ Key Issues\n`;
    localResponse += `• Placement Integrity: ${misplaced.length > 0 ? `${misplaced.length} misplaced item(s) detected` : "All shelf placements verified"}\n`;
    localResponse += `• Fleet Status: Forklifts Alpha & Beta are online.\n\n`;
    localResponse += `💡 Recommendation\n`;
    localResponse += `Verify shelf statuses and dispatch pending tasks via Mission Control to resolve anomalies.`;

    addMessage("assistant", localResponse);
  };

  // NLP parsing and execution engine
  const executeCommand = async (query: string) => {
    setIsThinking(true);
    setShowFailoverWarning(false);
    setThinkingLogs([
      "Analyzing warehouse data...",
      "Interfacing with physical warehouse registry...",
    ]);

    // Pronoun / Session Memory Resolver:
    let resolvedQuery = query.toLowerCase().trim();
    const referencesIt =
      resolvedQuery.includes(" it") ||
      resolvedQuery.includes(" that") ||
      resolvedQuery.includes(" fix it") ||
      resolvedQuery.includes(" show it") ||
      resolvedQuery.includes(" show me that") ||
      resolvedQuery.includes(" locate it") ||
      resolvedQuery.includes(" where is it") ||
      resolvedQuery.includes(" track it") ||
      resolvedQuery.includes(" follow it") ||
      resolvedQuery.includes(" assigned to it") ||
      resolvedQuery.includes(" assigned to fix it");

    if (referencesIt && messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const text = msg.text.toLowerCase();

        if (text.includes("alpha")) {
          resolvedQuery = resolvedQuery.replace(
            /\b(it|him|that|worker)\b/g,
            "alpha",
          );
          break;
        }
        if (text.includes("beta")) {
          resolvedQuery = resolvedQuery.replace(
            /\b(it|him|that|worker)\b/g,
            "beta",
          );
          break;
        }

        const foundItem = inventory.find((item) =>
          text.includes(item.name.toLowerCase()),
        );
        if (foundItem) {
          resolvedQuery = resolvedQuery.replace(
            /\b(it|that|them|item)\b/g,
            foundItem.name.toLowerCase(),
          );
          break;
        }

        const shelfMatch = msg.text.match(/\b([A-Za-z]\d+)\b/);
        if (shelfMatch) {
          resolvedQuery = resolvedQuery.replace(
            /\b(it|that|shelf)\b/g,
            `shelf ${shelfMatch[1]}`,
          );
          break;
        }
      }
    }

    const q = resolvedQuery;
    const cleanQ = q;

    // Check response cache first
    if (cacheRef.current[cleanQ]) {
      setTimeout(() => {
        setThinkingLogs((prev) => [
          ...prev,
          "Reading response cache...",
          "Correlating matching records...",
        ]);
      }, 200);
      setTimeout(() => {
        setIsThinking(false);
        addMessage("assistant", cacheRef.current[cleanQ]);
      }, 500);
      return;
    }

    // Determine if query is local Layer 1 or analytical Layer 2
    const isLocalQuery =
      q.includes("add") ||
      q.includes("register") ||
      q.includes("create") ||
      q.includes("update") ||
      q.includes("change") ||
      q.includes("set") ||
      q.includes("remove") ||
      q.includes("delete") ||
      q.includes("reduce") ||
      q.includes("subtract") ||
      q.includes("where") ||
      q.includes("find") ||
      q.includes("locate") ||
      q.includes("search") ||
      q.includes("show") ||
      q.includes("coordinate") ||
      q.includes("movement") ||
      q.includes("log") ||
      q.includes("history") ||
      q.includes("activity") ||
      q.includes("stock") ||
      q.includes("quantity") ||
      q.includes("how many") ||
      q.includes("restock") ||
      q.includes("reorder") ||
      q.includes("suggest") ||
      q.includes("report") ||
      q.includes("audit") ||
      q.includes("summary") ||
      q.includes("status") ||
      q.includes("count") ||
      q.includes("misplaced") ||
      q.includes("anomaly") ||
      q.includes("wrong") ||
      q.includes("optimize") ||
      q.includes("layout") ||
      q.includes("safety") ||
      q.includes("follow") ||
      q.includes("track") ||
      q.includes("alpha") ||
      q.includes("beta");

    if (isLocalQuery) {
      setTimeout(() => {
        setThinkingLogs((prev) => [
          ...prev,
          "Correlating inventory item records...",
        ]);
      }, 300);

      setTimeout(() => {
        setIsThinking(false);

        // 1. ADD Command
        const addMatchWithShelf = query.match(
          /(?:add|register|create)\s+(\d+)\s+([\w\s]+)\s+(?:to|at|in)\s+shelf\s+([A-Za-z]\d+)/i,
        );
        const addMatchWithZone = query.match(
          /(?:add|register|create)\s+(\d+)\s+([\w\s]+)\s+(?:to|at|in)\s+(Zone\s+[A-C]|Hazard\s+Storage|Cold\s+Storage)/i,
        );
        const addMatchSimple = query.match(
          /(?:add|register|create)\s+(\d+)\s+([\w\s]+)/i,
        );

        if (addMatchWithShelf) {
          const qty = parseInt(addMatchWithShelf[1]);
          const itemName = addMatchWithShelf[2].trim();
          const shelf = addMatchWithShelf[3].trim().toUpperCase();
          const category = getCategoryFromShelf(shelf);
          const zone = getZoneFromShelf(shelf);

          const responseText = addInventoryAI(
            itemName,
            qty,
            category,
            zone,
            shelf,
          );
          if (responseText) {
            addMessage(
              "assistant",
              `Registered ${qty} units of ${itemName} to Shelf ${shelf} (${zone}) successfully.\n\n💡 Recommendation\nCheck the Digital Twin view to monitor worker pathing to the shelf.`,
            );
            return;
          }
        } else if (addMatchWithZone) {
          const qty = parseInt(addMatchWithZone[1]);
          const itemName = addMatchWithZone[2].trim();
          const zoneInput = addMatchWithZone[3].trim();

          const existing = inventory.find((i) =>
            i.name.toLowerCase().includes(itemName.toLowerCase()),
          );
          const shelf = existing
            ? existing.assignedShelf
            : getDefaultShelfForZone(zoneInput);
          const category = existing
            ? existing.category
            : getCategoryFromShelf(shelf);
          const zone = getZoneFromShelf(shelf);

          const responseText = addInventoryAI(
            itemName,
            qty,
            category,
            zone,
            shelf,
          );
          if (responseText) {
            addMessage(
              "assistant",
              `Registered ${qty} units of ${itemName} to Zone ${zoneInput} (Shelf ${shelf}) successfully.\n\n💡 Recommendation\nCheck the Digital Twin view to monitor worker pathing to the shelf.`,
            );
            return;
          }
        } else if (
          addMatchSimple &&
          !q.includes("to shelf") &&
          !q.includes("at shelf") &&
          !q.includes("to zone")
        ) {
          const qty = parseInt(addMatchSimple[1]);
          const itemName = addMatchSimple[2].trim();

          const existing = inventory.find((i) =>
            i.name.toLowerCase().includes(itemName.toLowerCase()),
          );
          const shelf = existing ? existing.assignedShelf : "A1";
          const category = existing ? existing.category : "Electronics";
          const zone = existing ? existing.zone : "Zone A";

          const responseText = addInventoryAI(
            itemName,
            qty,
            category,
            zone,
            shelf,
          );
          if (responseText) {
            addMessage(
              "assistant",
              `Registered ${qty} units of ${itemName} to shelf ${shelf} successfully.\n\n💡 Recommendation\nCheck the Digital Twin view to monitor worker pathing to the shelf.`,
            );
            return;
          }
        }

        // 2. UPDATE Command
        const updateMatch =
          query.match(
            /(?:update|change|set)\s+([\w\s]+)\s+quantity\s+to\s+(\d+)/i,
          ) ||
          query.match(/(?:update|change|set)\s+([\w\s]+)\s+qty\s+to\s+(\d+)/i);
        if (updateMatch) {
          const itemName = updateMatch[1].trim();
          const qty = parseInt(updateMatch[2]);

          const responseText = updateInventoryAI(itemName, qty);
          if (responseText && !responseText.includes("not found")) {
            addMessage(
              "assistant",
              `Set quantity of ${itemName} to ${qty} units in registry successfully.\n\n💡 Recommendation\nEnsure that physical shelves are verified to match this stock adjustment.`,
            );
            return;
          } else {
            addMessage(
              "assistant",
              `Could not update: No item matching ${itemName} was found in active inventory.`,
            );
            return;
          }
        }

        // 3. REMOVE Command
        const removeMatch = query.match(
          /(?:remove|delete|reduce|subtract)\s+(\d+)\s+([\w\s]+)/i,
        );
        if (removeMatch) {
          const qty = parseInt(removeMatch[1]);
          const itemName = removeMatch[2].trim();

          const responseText = removeInventoryAI(itemName, qty);
          if (responseText && !responseText.includes("not found")) {
            addMessage(
              "assistant",
              `Removed ${qty} units of ${itemName} from warehouse stock.\n\n💡 Recommendation\nVerify the shelf capacity matches the remaining quantity.`,
            );
            return;
          } else {
            addMessage(
              "assistant",
              `Failed to remove: Item ${itemName} was not found, or quantity is insufficient.`,
            );
            return;
          }
        }

        // 4. Follow Worker Command
        if (q.includes("follow") || q.includes("track")) {
          const workerId = q.includes("beta")
            ? "beta"
            : q.includes("alpha")
              ? "alpha"
              : null;
          if (workerId) {
            setFollowingWorkerId(workerId);
            addMessage(
              "assistant",
              `Now tracking ${workerId === "alpha" ? "Alpha Forklift" : "Beta Forklift"} telemetry.\n\n💡 Recommendation\nUse the camera controls to follow the worker's movement.`,
            );
            setTimeout(() => {
              setRoute("twin");
            }, 600);
            return;
          }
        }

        // Worker status lookup
        if (
          q.includes("what") &&
          (q.includes("alpha") ||
            q.includes("beta") ||
            q.includes("worker") ||
            q.includes("forklift"))
        ) {
          const target = q.includes("beta") ? "beta" : "alpha";
          const worker = workers[target];
          if (worker) {
            let statusText = `${worker.name} status report:\n\n`;
            statusText += `• Status: ${worker.status.toUpperCase()}\n`;
            statusText += `• Job Description: ${worker.label}\n`;
            statusText += `• Payload: ${worker.carriedItemName || "None"}\n`;
            statusText += `• Position Coordinates: [${worker.position.map((n) => n.toFixed(2)).join(", ")}]\n\n`;
            statusText += `💡 Recommendation\n`;
            statusText += `Ensure worker is dispatched to active tasks in Mission Control if available.`;
            addMessage("assistant", statusText);
            return;
          }
        }

        // 5. FIND/LOCATE Command
        const locateWords = [
          "find",
          "locate",
          "where",
          "search",
          "show",
          "coordinate",
        ];
        if (locateWords.some((word) => q.includes(word))) {
          let searchName = q;
          locateWords.forEach((w) => {
            searchName = searchName.replace(w, "");
          });
          searchName = searchName
            .replace(/(?:are|is|the|for|item|unit|units|\?)/g, "")
            .trim();

          if (searchName) {
            const match = inventory.find((item) =>
              item.name.toLowerCase().includes(searchName),
            );
            if (match) {
              const success = locateItem(match.name);
              if (success) {
                const aisle = getAisleFromShelf(match.currentShelf);
                let locateText = `Found ${match.name} in warehouse registry:\n\n`;
                locateText += `• Total Inventory: ${match.quantity} units\n`;
                locateText += `• Zone: ${match.zone}\n`;
                locateText += `• Aisle: ${aisle}\n`;
                locateText += `• Shelf: Shelf ${match.currentShelf}\n`;
                locateText += `• Status: ${match.status.toUpperCase()}\n\n`;
                locateText += `💡 Recommendation\n`;
                locateText += `Click the Locate shortcut below to highlight this item's location on the digital twin.`;
                addMessage("assistant", locateText);
                setTimeout(() => {
                  setRoute("twin");
                }, 500);
                return;
              }
            }
          }
        }

        // 6. SEARCH MOVEMENT LOGS
        if (
          q.includes("movement") ||
          q.includes("log") ||
          q.includes("history") ||
          q.includes("activity")
        ) {
          const logs = useInvenioStore.getState().activities;
          let logsText = `Movement logs retrieved. Handled ${logs.length} telemetry transactions:\n\n`;
          logs.slice(0, 5).forEach((act) => {
            logsText += `• [${act.time}] ${act.message} (${act.type.toUpperCase()})\n`;
          });
          logsText += `\n💡 Recommendation\nAddress any warning or error events immediately to keep verification high.`;
          addMessage("assistant", logsText);
          return;
        }

        // 7. CHECK STOCK LEVELS
        if (
          q.includes("stock") ||
          q.includes("quantity") ||
          q.includes("how many")
        ) {
          let searchName = q
            .replace(
              /(?:check|stock|levels|level|of|quantity|how|many|units|do|we|have|\?)/g,
              "",
            )
            .trim();
          if (searchName) {
            const match = inventory.find((item) =>
              item.name.toLowerCase().includes(searchName),
            );
            if (match) {
              addMessage(
                "assistant",
                `Stock check: Found ${match.quantity} units of ${match.name}.\n\n• Total Inventory: ${match.quantity} units\n• Shelf: ${match.currentShelf}\n\n💡 Recommendation\nVerify replenishment schedule if levels fall below safety thresholds.`,
              );
              return;
            }
          }

          const lowStock = inventory.filter((item) => item.quantity < 50);
          let restockText = `Low stock audit complete. Found ${lowStock.length} items needing attention:\n\n`;
          lowStock.slice(0, 5).forEach((item) => {
            restockText += `• ${item.name} (Shelf ${item.currentShelf}): ${item.quantity} units remaining\n`;
          });
          restockText += `\n💡 Recommendation\nTrigger restock orders immediately for items below the safety threshold of 50 units.`;
          addMessage("assistant", restockText);
          return;
        }

        // 8. CREATE RESTOCK SUGGESTIONS
        if (
          q.includes("restock") ||
          q.includes("reorder") ||
          q.includes("suggest")
        ) {
          const lowStock = inventory.filter((item) => item.quantity < 50);
          let restockText = `Generated AI restock suggestions based on pick velocities:\n\n`;
          lowStock.slice(0, 3).forEach((item) => {
            restockText += `• ${item.name}: Current quantity is ${item.quantity} units (safety limit is 50)\n`;
          });
          restockText += `\n💡 Recommendation\nDispatch reorders for these items immediately to prevent out-of-stock incidents.`;
          addMessage("assistant", restockText);
          return;
        }

        // 9. GENERATE WAREHOUSE REPORTS
        if (q.includes("report") || q.includes("audit")) {
          const totalItems = inventory.reduce(
            (acc, curr) => acc + curr.quantity,
            0,
          );
          const verifiedShelves = Object.values(
            useInvenioStore.getState().shelves,
          ).filter((s) => s.status === "verified").length;
          const totalShelves = Object.keys(
            useInvenioStore.getState().shelves,
          ).length;
          const activeAlerts = alerts.filter((a) => !a.resolved).length;

          let reportText = `Warehouse Health report generated. Operational status is within normal tolerances:\n\n`;
          reportText += `• Total Registry Count: ${totalItems.toLocaleString()} units\n`;
          reportText += `• Verification Rate: ${((verifiedShelves / totalShelves) * 100).toFixed(1)}%\n`;
          reportText += `• Critical Incidents: ${activeAlerts}\n`;
          reportText += `• Fleet Status: Forklifts Alpha & Beta online\n\n`;
          reportText += `⚠️ Key Issues\n`;
          reportText += `• Incidents: ${activeAlerts} unresolved alerts require operator review.\n\n`;
          reportText += `💡 Recommendation\n`;
          reportText += `Run the layout optimization utility and resolve critical misplacements to restore 100% accuracy.`;

          addMessage("assistant", reportText);
          return;
        }

        addMessage(
          "assistant",
          `I could not map your query to a direct transaction.\n\n💡 Recommendation\nTry using natural questions like: 'Where is Sprite Bottles?', 'Show active alerts', 'Suggest restock suggestions', or 'Generate warehouse report'.`,
        );
      }, 800);
    } else {
      // Layer 2: OpenRouter analytical query
      setThinkingLogs((prev) => [
        ...prev,
        "Analyzing query context...",
        "Contacting GPT-OSS-120B analytical model...",
      ]);

      const apiKey = process.env.VITE_OPENROUTER_API_KEY || "";
      if (!apiKey) {
        // Failover instantly if API key is missing
        setTimeout(() => {
          triggerFailover(query, "API key not configured.");
        }, 500);
        return;
      }

      try {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 9000);

        // Serialize Context (Data Privacy Guard)
        const storeState = useInvenioStore.getState();
        const safeInventory = storeState.inventory.map((item) => ({
          sku: item.sku,
          name: item.name,
          category: item.category,
          currentShelf: item.currentShelf,
          assignedShelf: item.assignedShelf,
          status: item.status,
          quantity: item.quantity,
          zone: item.zone,
        }));
        const safeShelves = Object.values(storeState.shelves).map((shelf) => ({
          id: shelf.id,
          name: shelf.name,
          zone: shelf.zone,
          status: shelf.status,
        }));
        const safeWorkers = Object.values(storeState.workers).map((worker) => ({
          id: worker.id,
          name: worker.name,
          status: worker.status,
          label: worker.label,
          carriedItem: worker.carriedItemName,
        }));
        const safeTasks = storeState.taskQueue.map((task) => ({
          id: task.id,
          itemName: task.itemName,
          itemShelfId: task.itemShelfId,
          correctShelfId: task.correctShelfId,
          status: task.status,
          assignedWorkerId: task.assignedWorkerId,
          type: task.type,
        }));
        const safeAlerts = storeState.alerts.map((alert) => ({
          id: alert.id,
          severity: alert.severity,
          message: alert.message,
          shelfId: alert.shelfId,
          resolved: alert.resolved,
        }));

        const warehouseContext = {
          inventory: safeInventory,
          shelves: safeShelves,
          workers: safeWorkers,
          taskQueue: safeTasks,
          alerts: safeAlerts,
          kpi: {
            totalInventoryQty: safeInventory.reduce(
              (acc, curr) => acc + curr.quantity,
              0,
            ),
            accuracy:
              storeState.inventory.length > 0
                ? (
                    (1 -
                      storeState.inventory.filter(
                        (item) =>
                          item.status === "error" ||
                          item.assignedShelf !== item.currentShelf,
                      ).length /
                        storeState.inventory.length) *
                    100
                  ).toFixed(1)
                : "100.0",
            activeAlertsCount: safeAlerts.filter((a) => !a.resolved).length,
            activeWorkersCount: safeWorkers.filter((w) => w.status !== "idle")
              .length,
          },
        };

        const historyMessages = messages.slice(-8).map((msg) => ({
          role:
            msg.sender === "user" ? ("user" as const) : ("assistant" as const),
          content: msg.text,
        }));

        const apiResponse = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "https://invenio.os",
              "X-Title": "Invenio OS",
            },
            signal: controller.signal,
            body: JSON.stringify({
              model: "openai/gpt-oss-120b:free",
              messages: [
                {
                  role: "system",
                  content: `You are Invenio OS Assistant, a professional Warehouse Intelligence Copilot.\n\nRULES FOR RESPONSES:\n1. Speak in a concise, supervisor/executive-ready operational tone.\n2. ALWAYS format responses into executive-style cards using specific headers and bullet lists:\n   - For KPIs: use bullet list in format "• [KPI Name]: [Value]" (e.g. "• Inventory Accuracy: 98.2%", "• Total Registry Count: 2,972 units", "• Verified Items: 46", "• Critical Alerts: 1")\n   - For Warnings/Alerts: use a section starting with "⚠️ Key Issues" or "⚠️ Warning Details"\n   - For actionable advice: use a section starting with "💡 Recommendation"\n3. Avoid generic pleasantries, markdown tables, or raw debug code blocks.\n4. Keep the summary high-level and focus on warehouse operations, worker states, and inventory accuracy.\n\nContext snapshot:\n${JSON.stringify(warehouseContext, null, 2)}`,
                },
                ...historyMessages,
                {
                  role: "user",
                  content: query,
                },
              ],
            }),
          },
        );

        clearTimeout(timeoutId);

        if (!apiResponse.ok) {
          throw new Error(`API returned status ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        const textResponse =
          data.choices?.[0]?.message?.content || "No response generated by AI.";

        // Cache the response
        cacheRef.current[cleanQ] = textResponse;

        setIsThinking(false);
        addMessage("assistant", textResponse);
      } catch (err: any) {
        if (err.name === "AbortError") {
          // Check if it was cancelled by user
          // If so, handleCancelRequest already updated the UI. Otherwise, it was a timeout.
          if (isThinking) {
            triggerFailover(query, "analytical query timed out.");
          }
        } else {
          triggerFailover(query, err.message || "connection error.");
        }
      }
    }
  };

  // Pre-baked tags triggers
  const handleTrigger = (type: "misplaced" | "optimize" | "summary") => {
    let userText = "";
    if (type === "misplaced") userText = "Scan for misplaced items";
    else if (type === "optimize") userText = "Suggest layout optimizations";
    else userText = "Generate warehouse status summary";

    addMessage("user", userText);
    setIsThinking(true);
    setShowFailoverWarning(false);
    setThinkingLogs([
      "Initiating spatial audit...",
      "Fetching spatial data streams...",
    ]);

    setTimeout(() => {
      setIsThinking(false);
      if (type === "misplaced") {
        const misplaced = inventory.filter(
          (item) =>
            item.status === "error" || item.assignedShelf !== item.currentShelf,
        );

        const content = (
          <div className="mt-2 space-y-3">
            <p className="text-[10px] text-[#A1A1AA]">
              I identified <strong>{misplaced.length}</strong> misplaced
              item(s):
            </p>
            <div className="border border-[#22252C] rounded-lg overflow-hidden bg-[#0B0B0D]">
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-[#22252C] bg-[#171A20] text-[#A1A1AA] font-bold uppercase">
                    <th className="p-2">Item Name</th>
                    <th className="p-2">Assigned</th>
                    <th className="p-2">Scanned</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#22252C]">
                  {misplaced.map((item) => (
                    <tr
                      key={item.sku}
                      className="hover:bg-[#171A20]/30 text-white"
                    >
                      <td className="p-2 font-medium">{item.name}</td>
                      <td className="p-2 font-mono text-zinc-500">
                        {item.assignedShelf}
                      </td>
                      <td className="p-2 font-mono text-[#EF4444] font-bold">
                        {item.currentShelf}
                      </td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => {
                            locateItem(item.name);
                            setRoute("twin");
                          }}
                          className="px-2 py-0.5 rounded bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30 hover:bg-[#FF6B35]/25 transition-all font-semibold uppercase text-[9px]"
                        >
                          Locate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
        addMessage(
          "assistant",
          `Spatial scanning complete. Found ${misplaced.length} placement anomalies.`,
          content,
        );
      } else if (type === "optimize") {
        const content = (
          <div className="mt-2 space-y-3">
            <p className="text-[10px] text-[#A1A1AA]">
              Current layout recommendations based on safety codes and zoning
              rules:
            </p>
            <div className="space-y-2">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 bg-[#171A20] border border-[#22252C] rounded-lg flex flex-col space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-white">
                      {rec.title}
                    </span>
                    <span className="text-[9px] font-mono text-[#FF6B35] uppercase font-semibold">
                      {rec.impact}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#A1A1AA] leading-normal">
                    {rec.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
        addMessage(
          "assistant",
          "I have calculated layout optimizations to isolate hazards and streamline picking paths.",
          content,
        );
      } else if (type === "summary") {
        const okShelves = Object.values(
          useInvenioStore.getState().shelves,
        ).filter((s) => s.status === "verified").length;
        const totalShelves = Object.keys(
          useInvenioStore.getState().shelves,
        ).length;
        const activeAlerts = alerts.filter((a) => !a.resolved).length;

        const content = (
          <div className="mt-2 grid grid-cols-2 gap-3.5">
            <div className="p-3 bg-[#171A20] border border-[#22252C] rounded-lg">
              <span className="text-[9px] uppercase tracking-wider text-[#A1A1AA] block">
                Verified Shelves
              </span>
              <span className="text-sm font-extrabold text-white mt-1 font-mono block">
                {okShelves} / {totalShelves} OK
              </span>
            </div>
            <div className="p-3 bg-[#171A20] border border-[#22252C] rounded-lg">
              <span className="text-[9px] uppercase tracking-wider text-[#A1A1AA] block">
                System Alerts
              </span>
              <span className="text-sm font-extrabold text-[#EF4444] mt-1 font-mono block">
                {activeAlerts} Active
              </span>
            </div>
          </div>
        );
        addMessage(
          "assistant",
          `Warehouse report ready. Operations are executing within normal tolerances.`,
          content,
        );
      }
    }, 900);
  };

  const parseAIResponseToComponents = (text: string) => {
    const lines = text.split("\n");
    const components: React.ReactNode[] = [];
    let currentBulletList: string[] = [];

    const flushBullets = (key: string) => {
      if (currentBulletList.length > 0) {
        components.push(
          <ul key={key} className="space-y-1.5 my-2.5">
            {currentBulletList.map((bullet, bIdx) => (
              <li
                key={bIdx}
                className="flex items-start space-x-2 text-[11px] text-zinc-300 leading-normal"
              >
                <span className="text-[#FF6B35] mt-1 shrink-0">•</span>
                <span className="flex-1">{bullet}</span>
              </li>
            ))}
          </ul>,
        );
        currentBulletList = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        flushBullets(`bullets-empty-${i}`);
        continue;
      }

      // Check if it's a heading (e.g. ## Title or Title with emojis)
      const isHeader =
        line.startsWith("#") ||
        line.startsWith("📦") ||
        line.startsWith("⚠️") ||
        line.startsWith("💡") ||
        line.startsWith("🟢") ||
        line.startsWith("🔴") ||
        line.startsWith("📊") ||
        line.startsWith("📈") ||
        line.startsWith("🤖") ||
        line.startsWith("🚜");

      if (isHeader) {
        flushBullets(`bullets-hdr-${i}`);

        let headerText = line.replace(/^#+\s*/, "");
        let icon: string | null = null;

        if (line.includes("📦") || line.toLowerCase().includes("inventory"))
          icon = "📦";
        else if (
          line.includes("⚠️") ||
          line.toLowerCase().includes("issue") ||
          line.toLowerCase().includes("critical")
        )
          icon = "⚠️";
        else if (
          line.includes("💡") ||
          line.toLowerCase().includes("recommendation") ||
          line.toLowerCase().includes("action")
        )
          icon = "💡";
        else if (
          line.includes("📈") ||
          line.toLowerCase().includes("performance") ||
          line.toLowerCase().includes("accuracy")
        )
          icon = "📈";
        else if (
          line.includes("🚜") ||
          line.toLowerCase().includes("worker") ||
          line.toLowerCase().includes("alpha") ||
          line.toLowerCase().includes("beta")
        )
          icon = "🚜";
        else if (
          line.includes("📊") ||
          line.toLowerCase().includes("report") ||
          line.toLowerCase().includes("dashboard")
        )
          icon = "📊";

        if (icon) {
          headerText = headerText.replace(/[📦⚠️💡📈🚜📊🔴🟢]/g, "").trim();
        }

        const cleanHeaderText = headerText.replace(/\*/g, "");

        if (icon === "💡") {
          components.push(
            <div
              key={`rec-card-${i}`}
              className="my-3.5 p-3.5 bg-[#FF6B35]/5 border border-[#FF6B35]/25 rounded-xl flex items-start space-x-3.5"
            >
              <span className="text-base shrink-0">💡</span>
              <div className="flex-1 space-y-1">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Recommendation
                </span>
                <p className="text-[11px] text-[#A1A1AA] leading-normal">
                  {cleanHeaderText}
                </p>
              </div>
            </div>,
          );
        } else if (icon === "⚠️") {
          components.push(
            <div
              key={`warn-card-${i}`}
              className="my-3.5 p-3.5 bg-[#EF4444]/5 border border-[#EF4444]/25 rounded-xl flex items-start space-x-3.5"
            >
              <span className="text-base shrink-0">⚠️</span>
              <div className="flex-1 space-y-1">
                <span className="text-xs font-bold text-[#EF4444] uppercase tracking-wider block">
                  Key Issues / Alert Details
                </span>
                <p className="text-[11px] text-[#A1A1AA] leading-normal">
                  {cleanHeaderText}
                </p>
              </div>
            </div>,
          );
        } else {
          components.push(
            <h4
              key={`header-${i}`}
              className="text-xs font-extrabold text-white mt-4 mb-2 flex items-center space-x-2 border-b border-[#22252C]/30 pb-1 uppercase tracking-wider"
            >
              {icon && <span className="text-sm">{icon}</span>}
              <span>{cleanHeaderText}</span>
            </h4>,
          );
        }
        continue;
      }

      // Check if it's a bullet point
      if (
        line.startsWith("*") ||
        line.startsWith("-") ||
        line.startsWith("•")
      ) {
        let bulletText = line.substring(1).trim();
        bulletText = bulletText.replace(/\*\*(.*?)\*\*/g, "$1");

        const badgeMatch = bulletText.match(
          /(?:🔴|🟢|📦|📈)?\s*(Critical Alerts|Verified Items|Total Inventory|Inventory Accuracy|System Mode|Verification Rate|Active Alerts|Total Registry Count|Placement Integrity|Critical Incidents|Fleet Availability|Total Items|Verified Shelves|System Alerts):\s*(.+)/i,
        );

        if (badgeMatch) {
          const label = badgeMatch[1].trim();
          const val = badgeMatch[2].trim();

          let colorClass = "bg-zinc-800 text-zinc-300 border-zinc-700";
          let indicatorIcon = "📋";
          if (
            label.toLowerCase().includes("critical") ||
            label.toLowerCase().includes("alert") ||
            label.toLowerCase().includes("incident")
          ) {
            colorClass = "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25";
            indicatorIcon = "🔴";
          } else if (
            label.toLowerCase().includes("verified") ||
            label.toLowerCase().includes("accuracy") ||
            label.toLowerCase().includes("rate")
          ) {
            colorClass = "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/25";
            indicatorIcon = "🟢";
          } else if (
            label.toLowerCase().includes("inventory") ||
            label.toLowerCase().includes("registry") ||
            label.toLowerCase().includes("total")
          ) {
            colorClass = "bg-[#FF6B35]/10 text-[#FF6B35] border-[#FF6B35]/25";
            indicatorIcon = "📦";
          }

          components.push(
            <div
              key={`badge-${i}`}
              className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold mr-2 my-1.5 ${colorClass}`}
            >
              <span>{indicatorIcon}</span>
              <span className="uppercase tracking-wider opacity-85">
                {label}:
              </span>
              <span className="text-white">{val}</span>
            </div>,
          );
        } else {
          currentBulletList.push(bulletText);
        }
        continue;
      }

      flushBullets(`bullets-txt-${i}`);
      const cleanText = line.replace(/\*\*(.*?)\*\*/g, "$1");
      components.push(
        <p
          key={`p-${i}`}
          className="text-[11px] text-zinc-400 leading-relaxed my-2"
        >
          {cleanText}
        </p>,
      );
    }

    flushBullets(`bullets-final`);
    return components.length > 0 ? (
      components
    ) : (
      <div className="text-[11px] text-zinc-400">{text}</div>
    );
  };

  const renderActionButtons = (msg: Message) => {
    if (msg.sender !== "assistant") return null;

    const buttons: React.ReactNode[] = [];
    const textLower = msg.text.toLowerCase();

    // 1. Inventory Category
    const matchedItem = inventory.find((item) =>
      textLower.includes(item.name.toLowerCase()),
    );
    if (matchedItem) {
      buttons.push(
        <button
          key="locate-item"
          onClick={() => {
            locateItem(matchedItem.name);
            setRoute("twin");
          }}
          className="px-2.5 py-1 rounded bg-[#FF6B35]/15 hover:bg-[#FF6B35]/30 border border-[#FF6B35]/30 text-white font-semibold uppercase text-[9px] transition-all flex items-center space-x-1"
        >
          <span>📍 Locate {matchedItem.name}</span>
        </button>,
      );
      buttons.push(
        <button
          key="open-shelf"
          onClick={() => {
            locateItem(matchedItem.name);
            setRoute("twin");
          }}
          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-semibold uppercase text-[9px] transition-all flex items-center space-x-1"
        >
          <span>
            📂 Open Shelf{" "}
            {matchedItem.currentShelf || matchedItem.assignedShelf}
          </span>
        </button>,
      );
      buttons.push(
        <button
          key="view-record"
          onClick={() => setRoute("inventory")}
          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-semibold uppercase text-[9px] transition-all flex items-center space-x-1"
        >
          <span>📋 View Inventory Record</span>
        </button>,
      );
    }

    // 2. Alerts Category
    if (
      textLower.includes("alert") ||
      textLower.includes("misplaced") ||
      textLower.includes("issue") ||
      textLower.includes("anomaly") ||
      textLower.includes("critical")
    ) {
      buttons.push(
        <button
          key="view-alert"
          onClick={() => setRoute("alerts")}
          className="px-2.5 py-1 rounded bg-[#EF4444]/15 hover:bg-[#EF4444]/30 border border-[#EF4444]/30 text-[#EF4444] font-semibold uppercase text-[9px] transition-all flex items-center space-x-1"
        >
          <span>⚠️ View Alert</span>
        </button>,
      );
      buttons.push(
        <button
          key="assign-worker"
          onClick={() => setRoute("simulator")}
          className="px-2.5 py-1 rounded bg-[#FF6B35]/15 hover:bg-[#FF6B35]/30 border border-[#FF6B35]/30 text-white font-semibold uppercase text-[9px] transition-all flex items-center space-x-1"
        >
          <span>🔧 Assign Worker</span>
        </button>,
      );
      buttons.push(
        <button
          key="open-alerts-tab"
          onClick={() => setRoute("alerts")}
          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-semibold uppercase text-[9px] transition-all flex items-center space-x-1"
        >
          <span>🔔 Open Alerts Tab</span>
        </button>,
      );
    }

    // 3. Workers Category
    if (
      textLower.includes("alpha") ||
      textLower.includes("beta") ||
      textLower.includes("forklift") ||
      textLower.includes("worker")
    ) {
      if (
        textLower.includes("alpha") ||
        (!textLower.includes("beta") && !textLower.includes("alpha"))
      ) {
        buttons.push(
          <button
            key="follow-alpha"
            onClick={() => {
              setFollowingWorkerId("alpha");
              setRoute("twin");
            }}
            className="px-2.5 py-1 rounded bg-[#FF6B35]/15 hover:bg-[#FF6B35]/30 border border-[#FF6B35]/30 text-white font-semibold uppercase text-[9px] transition-all flex items-center space-x-1"
          >
            <span>🚜 Follow Alpha</span>
          </button>,
        );
      }
      if (
        textLower.includes("beta") ||
        (!textLower.includes("beta") && !textLower.includes("alpha"))
      ) {
        buttons.push(
          <button
            key="follow-beta"
            onClick={() => {
              setFollowingWorkerId("beta");
              setRoute("twin");
            }}
            className="px-2.5 py-1 rounded bg-[#FF6B35]/15 hover:bg-[#FF6B35]/30 border border-[#FF6B35]/30 text-white font-semibold uppercase text-[9px] transition-all flex items-center space-x-1"
          >
            <span>🚜 Follow Beta</span>
          </button>,
        );
      }
      buttons.push(
        <button
          key="open-mission-control"
          onClick={() => setRoute("simulator")}
          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-semibold uppercase text-[9px] transition-all flex items-center space-x-1"
        >
          <span>🎮 Open Mission Control</span>
        </button>,
      );
    }

    // 4. Reports & Analytics Category
    if (
      textLower.includes("report") ||
      textLower.includes("summary") ||
      textLower.includes("kpi") ||
      textLower.includes("performance") ||
      textLower.includes("audit") ||
      textLower.includes("layout") ||
      textLower.includes("optimize") ||
      textLower.includes("analytics")
    ) {
      buttons.push(
        <button
          key="export-report"
          onClick={() => {
            const reportText = `INVENIO OS WAREHOUSE HEALTH REPORT\nGenerated: ${new Date().toLocaleString()}\n\nContent:\n${msg.text}`;
            const blob = new Blob([reportText], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `invenio_warehouse_report_${Date.now()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-2.5 py-1 rounded bg-[#22C55E]/15 hover:bg-[#22C55E]/30 border border-[#22C55E]/30 text-[#22C55E] font-semibold uppercase text-[9px] transition-all flex items-center space-x-1"
        >
          <span>📥 Export Report</span>
        </button>,
      );
      buttons.push(
        <button
          key="view-dashboard"
          onClick={() => setRoute("dashboard")}
          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-semibold uppercase text-[9px] transition-all flex items-center space-x-1"
        >
          <span>📊 View Dashboard</span>
        </button>,
      );
    }

    if (buttons.length === 0) return null;

    return (
      <div className="mt-3.5 flex flex-wrap gap-2 pt-2 border-t border-[#22252C]/40">
        {buttons}
      </div>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const query = input;
    setInput("");
    addMessage("user", query);
    executeCommand(query);
  };

  return (
    <div className="w-full h-full p-6 flex flex-col space-y-6 overflow-hidden bg-[#0B0B0D] text-white">
      {/* Title */}
      <div className="flex items-center space-x-3 pb-4 border-b border-[#22252C]">
        <BrainCircuit className="w-5 h-5 text-[#FF6B35] animate-pulse" />
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white m-0">
            Invenio AI Terminal
          </h2>
          <p className="text-[10px] text-[#A1A1AA] mt-1 uppercase tracking-widest">
            Natural language catalog queries and automated registry adjustments
          </p>
        </div>
      </div>

      {/* Main chat window */}
      <div className="flex-1 bg-[#121317] rounded-xl border border-[#22252C] p-4 flex flex-col justify-between overflow-hidden relative">
        {/* Messages feed */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
          {/* Failover Warning Banner */}
          {showFailoverWarning && (
            <div className="bg-[#FF6B35]/10 border border-[#FF6B35]/20 p-2.5 rounded-lg flex items-center justify-between text-[10px] text-zinc-350">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>
                  Advanced AI temporarily unavailable. Using local warehouse
                  intelligence.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowFailoverWarning(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto my-6 p-6 bg-[#0B0B0D]/50 border border-[#22252C] rounded-2xl space-y-5">
              <div className="flex items-center space-x-3.5 pb-4 border-b border-[#22252C]">
                <div className="p-2.5 rounded-xl bg-[#FF6B35]/10 border border-[#FF6B35]/25 text-[#FF6B35]">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    👋 Welcome to Invenio AI
                  </h3>
                  <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider mt-0.5">
                    Warehouse Operations Copilot
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider block">
                  I can help you:
                </span>
                <ul className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300">
                  <li className="flex items-center space-x-2 bg-[#171A20]/50 p-2 rounded-lg border border-[#22252C]/40">
                    <span className="text-[#FF6B35]">📍</span>
                    <span>Locate inventory</span>
                  </li>
                  <li className="flex items-center space-x-2 bg-[#171A20]/50 p-2 rounded-lg border border-[#22252C]/40">
                    <span className="text-[#FF6B35]">🚜</span>
                    <span>Track workers</span>
                  </li>
                  <li className="flex items-center space-x-2 bg-[#171A20]/50 p-2 rounded-lg border border-[#22252C]/40">
                    <span className="text-[#FF6B35]">⚠️</span>
                    <span>Find misplaced items</span>
                  </li>
                  <li className="flex items-center space-x-2 bg-[#171A20]/50 p-2 rounded-lg border border-[#22252C]/40">
                    <span className="text-[#FF6B35]">🔔</span>
                    <span>Review alerts</span>
                  </li>
                  <li className="flex items-center space-x-2 bg-[#171A20]/50 p-2 rounded-lg border border-[#22252C]/40">
                    <span className="text-[#FF6B35]">📊</span>
                    <span>Generate reports</span>
                  </li>
                  <li className="flex items-center space-x-2 bg-[#171A20]/50 p-2 rounded-lg border border-[#22252C]/40">
                    <span className="text-[#FF6B35]">📈</span>
                    <span>Analyze performance</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-[#22252C]/40">
                <span className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider block">
                  Try asking:
                </span>
                <div className="flex flex-col space-y-2">
                  {[
                    "Where are the batteries?",
                    "Show pending tasks",
                    "Generate today's warehouse summary",
                  ].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setInput(q)}
                      className="text-left text-[11px] text-[#A1A1AA] hover:text-white px-3 py-2 bg-[#171A20]/30 hover:bg-[#171A20]/80 border border-[#22252C] rounded-lg transition-all font-mono"
                    >
                      &gt; "{q}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3.5 max-w-2xl ${
                msg.sender === "user"
                  ? "ml-auto flex-row-reverse space-x-reverse"
                  : ""
              }`}
            >
              {/* Profile Icon */}
              <div
                className={`p-2 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.sender === "user"
                    ? "bg-[#171A20] border border-[#22252C] text-[#A1A1AA]"
                    : "bg-[#FF6B35]/15 border border-[#FF6B35]/20 text-[#FF6B35]"
                }`}
              >
                {msg.sender === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>

              {/* Text box */}
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[#171A20] border-[#22252C] text-white rounded-tr-none"
                    : "bg-[#0B0B0D]/60 border-[#22252C] text-zinc-350 rounded-tl-none"
                }`}
              >
                {msg.sender === "user" ? (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                ) : (
                  <div className="space-y-1">
                    {parseAIResponseToComponents(msg.text)}
                  </div>
                )}
                {msg.customContent && (
                  <div className="mt-1">{msg.customContent}</div>
                )}
                {renderActionButtons(msg)}
              </div>
            </div>
          ))}

          {/* Thinking simulator indicator */}
          {isThinking && (
            <div className="flex items-start space-x-3.5 max-w-2xl animate-pulse">
              <div className="p-2 rounded-lg bg-[#FF6B35]/15 border border-[#FF6B35]/25 text-[#FF6B35] flex items-center justify-center">
                <BrainCircuit className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3.5 bg-[#0B0B0D] border border-[#22252C] rounded-xl rounded-tl-none flex flex-col space-y-2 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#FF6B35] font-bold uppercase tracking-wider flex items-center">
                    <Terminal className="w-3.5 h-3.5 mr-1.5" />
                    AI Execution core...
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    className="text-[9px] px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded border border-zinc-700 transition-all font-mono"
                  >
                    CANCEL
                  </button>
                </div>
                <div className="font-mono text-[9px] text-[#A1A1AA] space-y-1">
                  {thinkingLogs.map((log, idx) => (
                    <div key={idx}>&gt; {log}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggestion tags */}
        <div className="flex flex-wrap gap-2.5 pb-3 border-t border-[#22252C] pt-3">
          <button
            type="button"
            onClick={() => handleTrigger("misplaced")}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#171A20] hover:bg-[#22252C] border border-[#22252C] text-[10px] font-semibold text-[#A1A1AA] hover:text-white transition-all"
            disabled={isThinking}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Scan for misplaced items</span>
          </button>

          <button
            type="button"
            onClick={() => handleTrigger("optimize")}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#171A20] hover:bg-[#22252C] border border-[#22252C] text-[10px] font-semibold text-[#A1A1AA] hover:text-white transition-all"
            disabled={isThinking}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-[#FF6B35]" />
            <span>Suggest layout optimization</span>
          </button>

          <button
            type="button"
            onClick={() => handleTrigger("summary")}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#171A20] hover:bg-[#22252C] border border-[#22252C] text-[10px] font-semibold text-[#A1A1AA] hover:text-white transition-all"
            disabled={isThinking}
          >
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
            <span>Generate warehouse summary</span>
          </button>
        </div>

        {/* Chat input box */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center space-x-3 bg-[#171A20] p-2 rounded-xl border border-[#22252C]"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI Assistant (e.g. 'Where are Sprite Bottles?' or 'Add 10 Motor units to shelf A1')..."
            className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder-zinc-500 focus:ring-0 px-2"
            disabled={isThinking}
          />
          <button
            type="submit"
            className="p-2 rounded-lg bg-[#FF6B35] hover:bg-[#E05626] text-white transition-colors"
            disabled={isThinking || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
