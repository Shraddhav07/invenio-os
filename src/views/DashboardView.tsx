import React, { useState } from 'react'
import { useInvenioStore } from '../store/store'
import { WarehouseMapView } from './WarehouseMapView'
import { 
  ShieldCheck, Database, ClipboardSignature, AlertTriangle, 
  Clock, Activity, BrainCircuit, Truck, ClipboardList, TrendingUp,
  X, Search, Eye, Play, Trash2, ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const DashboardView: React.FC = () => {
  const { 
    inventory, 
    shelves, 
    alerts, 
    activities,
    eventThroughput,
    workers,
    taskQueue,
    demoMode,
    setDemoMode,
    setRoute,
    dispatchWorkerToTask,
    cancelTask,
    locateItem
  } = useInvenioStore()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerFilter, setDrawerFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all')
  const [drawerSearch, setDrawerSearch] = useState('')

  // 1. Total Inventory Items quantity
  const totalInventoryCount = inventory.reduce((acc, curr) => acc + curr.quantity, 0)

  // 2. Inventory Accuracy (Percentage of non-misplaced items)
  const misplacedItems = inventory.filter(item => item.status === 'error' || item.assignedShelf !== item.currentShelf)
  const accuracy = inventory.length > 0 
    ? ((1 - (misplacedItems.length / inventory.length)) * 100).toFixed(1) 
    : '100.0'

  // 3. Pending Verifications
  const pendingVerifications = Object.values(shelves).filter(s => s.status === 'pending').length

  // 4. Critical Alerts count
  const criticalAlertsCount = alerts.filter(a => !a.resolved && a.severity === 'critical').length

  // 5. Active Fleet Count
  const totalWorkers = Object.keys(workers).length
  const activeWorkers = Object.values(workers).filter(w => w.status !== 'idle').length

  // 6. Task Operations Count
  const pendingTasks = taskQueue.filter(t => t.status === 'pending').length
  const activeTasks = taskQueue.filter(t => t.status === 'active').length

  // AI Dynamic Insights from Inventory Data
  const generateInsights = () => {
    const list: string[] = []

    if (misplacedItems.length > 0) {
      const first = misplacedItems[0]
      list.push(`${first.name} misplaced on shelf ${first.currentShelf} instead of ${first.assignedShelf}.`)
    } else {
      list.push(`All shelf placements verified. No misplaced anomalies detected.`)
    }

    list.push(`Zone B utilization reached 92%. Plan restocking layout optimization.`)

    const lowStockItems = inventory.filter(item => item.quantity < 35)
    if (lowStockItems.length > 0) {
      const firstLow = lowStockItems[0]
      list.push(`${firstLow.name} may run out within 5 days (${firstLow.quantity} units left).`)
    } else {
      list.push(`Stable supply chain. Safety stock thresholds satisfied.`)
    }

    list.push(`Cold Storage utilization increased by 12% due to new medical vaccine arrivals.`)

    return list
  }

  const insights = generateInsights()

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-6 overflow-y-auto bg-[#0B0B0D] text-white">
      
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white m-0">
            Operations Command Center
          </h2>
          <p className="text-[10px] text-[#A1A1AA] uppercase tracking-widest mt-1">
            Real-time warehouse health & inventory verification
          </p>
        </div>
        
        {/* Stream Live status ticker */}
        <div className="flex items-center space-x-2 px-3 py-1 bg-[#121317] rounded-full border border-[#22252C] text-[10px]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B35] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF6B35]"></span>
          </span>
          <span className="font-mono text-zinc-400">
            Live telemetry stream: {eventThroughput[eventThroughput.length - 1]} msg/s
          </span>
        </div>
      </div>

      {/* Warehouse Operating Mode Status Card */}
      <div className="p-4 rounded-xl border border-[#FF6B35]/20 bg-gradient-to-r from-[#181210] to-[#121317] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className={`relative flex h-2 w-2`}>
              {demoMode && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B35] opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${demoMode ? 'bg-[#FF6B35]' : 'bg-zinc-600'}`}></span>
            </span>
            <h4 className="text-xs font-bold tracking-wider uppercase font-mono text-zinc-200">
              {demoMode ? 'LIVE DEMO MODE' : 'MANUAL MODE'}
            </h4>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1 max-w-2xl">
            {demoMode 
              ? 'Simulation Active: Automatically generating inventory arrivals, shelf placement scans, AI recommendations, and worker assignments.'
              : 'Manual Override Active: Simulation events are paused. Direct dispatch controls are enabled for full worker guidance.'}
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-[10px] font-mono w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center px-2 py-1 bg-zinc-900/60 rounded border border-zinc-800/80 min-w-[80px]">
              <span className="text-[8px] text-zinc-500 uppercase">Auto Tasks</span>
              <span className={`font-bold mt-0.5 ${demoMode ? 'text-[#FF6B35]' : 'text-zinc-600'}`}>
                {demoMode ? 'RUNNING' : 'PAUSED'}
              </span>
            </div>
            <div className="flex flex-col items-center px-2 py-1 bg-zinc-900/60 rounded border border-zinc-800/80 min-w-[80px]">
              <span className="text-[8px] text-zinc-500 uppercase">Auto Workers</span>
              <span className={`font-bold mt-0.5 ${demoMode ? 'text-[#FF6B35]' : 'text-zinc-600'}`}>
                {demoMode ? 'RUNNING' : 'PAUSED'}
              </span>
            </div>
            <div className="flex flex-col items-center px-2 py-1 bg-zinc-900/60 rounded border border-zinc-800/80 min-w-[80px]">
              <span className="text-[8px] text-zinc-500 uppercase">Auto Alerts</span>
              <span className={`font-bold mt-0.5 ${demoMode ? 'text-[#FF6B35]' : 'text-zinc-600'}`}>
                {demoMode ? 'RUNNING' : 'PAUSED'}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`px-3 py-1 rounded font-bold tracking-wide border transition-all ${
              demoMode 
                ? 'bg-[#FF6B35] text-black border-[#FF6B35] hover:bg-[#FF8A5B]' 
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:text-white'
            }`}
          >
            {demoMode ? 'Pause Auto' : 'Resume Auto'}
          </button>
        </div>
      </div>

      {/* Top Section: 6 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1: Inventory Accuracy */}
        <div 
          onClick={() => setRoute('alerts')}
          className="bg-[#121317] border border-[#22252C] hover:border-zinc-700 cursor-pointer p-4 rounded-xl flex items-center justify-between h-24 transition-all"
        >
          <div className="space-y-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-[#A1A1AA]">
              Accuracy
            </span>
            <h3 className="text-lg font-bold text-white font-mono leading-none">
              {accuracy}%
            </h3>
            <span className="text-[8px] text-[#22C55E]">Optimal safety</span>
          </div>
          <div className="p-2 rounded-lg bg-[#22C55E]/10 text-[#22C55E]">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Card 2: Total Inventory */}
        <div 
          onClick={() => setRoute('inventory')}
          className="bg-[#121317] border border-[#22252C] hover:border-zinc-700 cursor-pointer p-4 rounded-xl flex items-center justify-between h-24 transition-all"
        >
          <div className="space-y-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-[#A1A1AA]">
              Total Qty
            </span>
            <h3 className="text-lg font-bold text-white font-mono leading-none">
              {totalInventoryCount.toLocaleString()}
            </h3>
            <span className="text-[8px] text-zinc-500">{inventory.length} SKUs</span>
          </div>
          <div className="p-2 rounded-lg bg-[#FF6B35]/10 text-[#FF6B35]">
            <Database className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Card 3: Pending Verification */}
        <div 
          onClick={() => setRoute('twin')}
          className="bg-[#121317] border border-[#22252C] hover:border-zinc-700 cursor-pointer p-4 rounded-xl flex items-center justify-between h-24 transition-all"
        >
          <div className="space-y-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-[#A1A1AA]">
              Pending
            </span>
            <h3 className="text-lg font-bold text-white font-mono leading-none">
              {pendingVerifications}
            </h3>
            <span className="text-[8px] text-[#F59E0B]">Sensor cycle active</span>
          </div>
          <div className="p-2 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B]">
            <ClipboardSignature className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Card 4: Critical Alerts */}
        <div 
          onClick={() => setRoute('alerts')}
          className="bg-[#121317] border border-[#22252C] hover:border-zinc-700 cursor-pointer p-4 rounded-xl flex items-center justify-between h-24 transition-all"
        >
          <div className="space-y-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-[#A1A1AA]">
              Alerts
            </span>
            <h3 className="text-lg font-bold text-white font-mono leading-none">
              {criticalAlertsCount}
            </h3>
            <span className="text-[8px] text-[#EF4444]">{criticalAlertsCount > 0 ? 'Anomaly found' : 'Healthy status'}</span>
          </div>
          <div className="p-2 rounded-lg bg-[#EF4444]/10 text-[#EF4444]">
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Card 5: Fleet Status */}
        <div 
          onClick={() => setRoute('simulator')}
          className="bg-[#121317] border border-[#22252C] hover:border-zinc-700 cursor-pointer p-4 rounded-xl flex items-center justify-between h-24 transition-all"
        >
          <div className="space-y-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-[#A1A1AA]">
              Active Fleet
            </span>
            <h3 className="text-lg font-bold text-white font-mono leading-none">
              {activeWorkers}/{totalWorkers}
            </h3>
            <span className="text-[8px] text-[#FF6B35]">AGV Units Online</span>
          </div>
          <div className="p-2 rounded-lg bg-[#FF6B35]/10 text-[#FF6B35]">
            <Truck className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Card 6: Task Operations */}
        <div 
          onClick={() => { setDrawerOpen(true); setDrawerFilter('all'); }}
          className="bg-[#121317] border border-[#22252C] hover:border-[#FF6B35]/50 hover:bg-[#1C1816] cursor-pointer p-4 rounded-xl flex items-center justify-between h-24 transition-all"
        >
          <div className="space-y-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-[#FF6B35]">
              Tasks Pending
            </span>
            <h3 className="text-lg font-bold text-[#FF6B35] font-mono leading-none">
              {pendingTasks}
            </h3>
            <span className="text-[8px] text-zinc-400">{activeTasks} active tasks</span>
          </div>
          <div className="p-2 rounded-lg bg-[#FF6B35]/10 text-[#FF6B35]">
            <ClipboardList className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {/* Middle Section: Digital Twin Viewport & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[420px]">
        {/* Large Digital Twin Preview (8 columns) */}
        <div className="lg:col-span-8 bg-[#121317] border border-[#22252C] rounded-xl overflow-hidden flex flex-col h-[480px]">
          <div className="px-4 py-3 border-b border-[#22252C] flex items-center justify-between bg-[#171A20]">
            <span className="text-[10px] uppercase tracking-wider font-bold text-white">
              Warehouse Map Live Preview
            </span>
            <span className="text-[9px] text-[#A1A1AA]">Interactive 3D Viewport</span>
          </div>
          <div className="flex-1 relative">
            <WarehouseMapView />
          </div>
        </div>

        {/* AI Insights Panel (4 columns) */}
        <div className="lg:col-span-4 bg-[#121317] border border-[#22252C] rounded-xl p-5 flex flex-col h-[480px]">
          <div className="flex items-center space-x-2 border-b border-[#22252C] pb-3 mb-4">
            <BrainCircuit className="w-4.5 h-4.5 text-[#FF6B35]" />
            <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">AI Operational Insights</h3>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {insights.map((insight, idx) => (
              <div 
                key={idx} 
                className="p-3 bg-[#171A20] border border-[#22252C] rounded-lg space-y-1.5 hover:border-[#FF6B35]/20 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
                  <span className="text-[9px] font-extrabold text-zinc-300 uppercase tracking-wider">Insight #{idx + 1}</span>
                </div>
                <p className="text-[10px] text-[#A1A1AA] leading-relaxed">
                  {insight}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Stable Forecasting Panel & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Stable Inventory Forecasting Panel (8 columns) */}
        <div className="lg:col-span-8 bg-[#121317] border border-[#22252C] rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between border-b border-[#22252C] pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4.5 h-4.5 text-[#FF6B35]" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">AI Inventory Forecasting & Capacity Planning</span>
            </div>
            <span className="text-[9px] text-[#22C55E] font-medium uppercase tracking-wider bg-[#22C55E]/10 px-2 py-0.5 rounded-full">Stabilized Trend</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#22252C] text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="py-2.5 px-3">Item SKU</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-right">Scanned Qty</th>
                  <th className="py-2.5 px-3 text-right">Avg 30-Day Demand</th>
                  <th className="py-2.5 px-3 text-center">Depletion Forecast</th>
                  <th className="py-2.5 px-3 text-center">Safety Threshold</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => {
                  // Calculate days until out of stock based on quantity and static safe depletion rates
                  const dailyUsage = item.name === 'Batteries' ? 45 : item.name === 'Sprite Bottles' ? 120 : 15
                  const daysToDepletion = Math.ceil(item.quantity / dailyUsage)
                  const isCritical = daysToDepletion <= 7
                  const isWarning = daysToDepletion > 7 && daysToDepletion <= 15
                  
                  return (
                    <tr 
                      key={item.sku}
                      className="border-b border-[#22252C]/40 text-[10px] hover:bg-[#171A20]/45 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-zinc-400">{item.sku}</td>
                      <td className="py-2.5 px-3 font-medium text-white">{item.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#A1A1AA]">{dailyUsage * 30} units</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-extrabold uppercase font-mono ${
                          isCritical ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/20' :
                          isWarning ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/20' :
                          'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/20'
                        }`}>
                          {daysToDepletion > 99 ? '99+ days' : `${daysToDepletion} days left`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            isCritical ? 'bg-[#EF4444]' :
                            isWarning ? 'bg-[#F59E0B]' :
                            'bg-[#22C55E]'
                          }`} />
                          <span className="text-[9px] font-medium text-zinc-400">
                            {isCritical ? 'Reorder Urgent' : isWarning ? 'Reorder Warning' : 'Optimal'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity & Today's Operations Feed (4 columns) */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          {/* Today's Operations Card */}
          <div className="bg-[#121317] border border-[#22252C] rounded-xl p-5 flex flex-col space-y-3.5">
            <div className="flex items-center space-x-2 border-b border-[#22252C] pb-3">
              <TrendingUp className="w-4.5 h-4.5 text-[#FF6B35]" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Today's Operations Summary</span>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div className="bg-[#171A20] p-3 rounded-lg border border-[#22252C]">
                <span className="text-[8px] text-[#A1A1AA] uppercase tracking-wider block">Jobs Completed</span>
                <span className="text-sm font-bold text-white font-mono block mt-1">
                  {taskQueue.filter(t => t.status === 'completed').length}
                </span>
              </div>
              <div className="bg-[#171A20] p-3 rounded-lg border border-[#22252C]">
                <span className="text-[8px] text-[#A1A1AA] uppercase tracking-wider block">Fleet Efficiency</span>
                <span className="text-sm font-bold text-white font-mono block mt-1">
                  {taskQueue.length > 0 
                    ? Math.round((taskQueue.filter(t => t.status === 'completed').length / taskQueue.length) * 100) 
                    : 100}%
                </span>
              </div>
              <div className="bg-[#171A20] p-3 rounded-lg border border-[#22252C] col-span-2">
                {(() => {
                  const recItems = inventory.filter(item => item.currentShelf === 'REC')
                  const recSlotsUsed = recItems.reduce((acc, curr) => acc + Math.ceil(curr.quantity / 10), 0)
                  return (
                    <>
                      <div className="flex justify-between items-center text-[8px] text-[#A1A1AA] uppercase tracking-wider">
                        <span>Receiving Dock Load</span>
                        <span className="font-mono text-zinc-350">{recSlotsUsed} / 20 Slots</span>
                      </div>
                      <div className="w-full bg-[#121317] h-1.5 rounded overflow-hidden mt-1.5 border border-[#22252C]">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            recSlotsUsed >= 18 ? 'bg-[#EF4444]' :
                            recSlotsUsed >= 15 ? 'bg-[#F59E0B]' :
                            'bg-[#FF6B35]'
                          }`}
                          style={{ width: `${Math.min(100, (recSlotsUsed / 20) * 100)}%` }}
                        />
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-[#121317] border border-[#22252C] rounded-xl p-5 flex flex-col justify-between flex-1">
            <div>
              <div className="flex items-center justify-between border-b border-[#22252C] pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4.5 h-4.5 text-[#FF6B35]" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Activity Feed</span>
                </div>
                <span className="text-[9px] text-[#A1A1AA]">Operational Timeline</span>
              </div>

              <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                {activities.slice(0, 10).map((act) => (
                  <div key={act.id} className="flex items-start justify-between text-[10px] border-b border-[#22252C]/30 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1.5 text-zinc-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-mono text-[9px]">{act.time}</span>
                      </div>
                      <span className={`font-medium ${
                        act.type === 'success' ? 'text-white' :
                        act.type === 'warning' ? 'text-[#F59E0B]' :
                        act.type === 'error' ? 'text-[#EF4444]' :
                        'text-[#A1A1AA]'
                      }`}>
                        {act.message}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        act.type === 'success' ? 'bg-[#22C55E]' :
                        act.type === 'warning' ? 'bg-[#F59E0B]' :
                        act.type === 'error' ? 'bg-[#EF4444]' :
                        'bg-[#A1A1AA]'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Register Drawer Overlay */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 z-[990] pointer-events-auto"
            />
            
            {/* Drawer Body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="absolute right-0 top-0 h-full w-[460px] bg-[#121317] border-l border-[#22252C] shadow-2xl z-[995] flex flex-col pointer-events-auto text-zinc-100"
            >
              {/* Header */}
              <div className="p-5 border-b border-[#22252C] flex items-center justify-between bg-[#16171D]">
                <div>
                  <h3 className="text-sm font-bold tracking-wide uppercase text-white font-mono flex items-center gap-2">
                    <ClipboardList className="w-4.5 h-4.5 text-[#FF6B35]" />
                    Task Register
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-1">Search, filter, and dispatch AGV relocation missions</p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded bg-zinc-800/60 border border-zinc-700/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filters & Search */}
              <div className="p-4 border-b border-[#22252C] bg-[#14151A] space-y-3">
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={drawerSearch}
                    onChange={(e) => setDrawerSearch(e.target.value)}
                    placeholder="Search by SKU or item name..."
                    className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs placeholder-zinc-500 text-white focus:outline-none focus:border-[#FF6B35]/50 transition font-mono"
                  />
                  {drawerSearch && (
                    <button 
                      onClick={() => setDrawerSearch('')}
                      className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex bg-zinc-900/60 p-0.5 rounded border border-zinc-800/80 text-[10px]">
                  {(['all', 'pending', 'active', 'completed'] as const).map((f) => {
                    const count = f === 'all' ? taskQueue.length : taskQueue.filter(t => t.status === f).length;
                    return (
                      <button
                        key={f}
                        onClick={() => setDrawerFilter(f)}
                        className={`flex-1 py-1.5 rounded font-bold uppercase transition ${
                          drawerFilter === f 
                            ? 'bg-[#FF6B35] text-black' 
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {f} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Task List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(() => {
                  const filtered = taskQueue.filter(t => {
                    if (drawerFilter !== 'all' && t.status !== drawerFilter) return false;
                    if (drawerSearch.trim() !== '') {
                      const query = drawerSearch.toLowerCase();
                      return t.itemName.toLowerCase().includes(query) || t.id.toLowerCase().includes(query);
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-xs">
                        <ClipboardList className="w-8 h-8 text-zinc-700 mb-2 stroke-[1.5]" />
                        <span>No matching tasks found</span>
                      </div>
                    )
                  }

                  return filtered.map((task) => (
                    <div 
                      key={task.id} 
                      className={`p-4 rounded-xl bg-zinc-900/80 border ${
                        task.status === 'active' ? 'border-emerald-500/20 bg-emerald-950/5' :
                        task.status === 'reserved' ? 'border-[#FF6B35]/20 bg-[#FF6B35]/5' :
                        'border-zinc-800'
                      } space-y-3`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-mono text-zinc-500 block uppercase">{task.id}</span>
                          <span className="text-xs font-bold text-white mt-0.5 block">{task.itemName}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                          task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                          task.status === 'active' ? 'bg-[#FF6B35]/15 text-[#FF6B35]' :
                          task.status === 'reserved' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {task.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 py-1 bg-zinc-950/40 px-3 rounded border border-zinc-900/50">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-zinc-600 uppercase">From</span>
                          <span className="font-bold text-zinc-300">{task.itemShelfId}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                        <div className="flex flex-col text-right">
                          <span className="text-[8px] text-zinc-600 uppercase">To</span>
                          <span className="font-bold text-[#FF6B35]">{task.correctShelfId}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/40">
                        <span>Type: <strong className="text-zinc-400 capitalize">{task.type}</strong></span>
                        <span>AGV: <strong className="text-zinc-400 uppercase">{task.assignedWorkerId || 'Unassigned'}</strong></span>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        {/* View in Twin */}
                        <button
                          onClick={() => {
                            setRoute('twin');
                            locateItem(task.itemName);
                            setDrawerOpen(false);
                          }}
                          className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition border border-zinc-700/50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Twin
                        </button>

                        {/* Dispatch Worker (if pending) */}
                        {task.status === 'pending' && (
                          <button
                            onClick={() => dispatchWorkerToTask(task.id)}
                            className="flex-1 py-1.5 rounded bg-[#FF6B35] hover:bg-[#FF8A5B] text-black text-[10px] font-bold flex items-center justify-center gap-1.5 transition"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Dispatch
                          </button>
                        )}

                        {/* Cancel Task */}
                        {task.status !== 'completed' && (
                          <button
                            onClick={() => cancelTask(task.id)}
                            className="p-1.5 rounded bg-zinc-900 hover:bg-rose-950/20 text-zinc-500 hover:text-rose-400 transition border border-zinc-800 hover:border-rose-900/30"
                            title="Cancel task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
