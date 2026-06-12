import React, { useState } from 'react'
import { 
  Cpu, Radio, Play, CheckCircle2, ChevronRight, CornerDownRight, Plus, RefreshCw, Truck, ClipboardList
} from 'lucide-react'
import { useInvenioStore } from '../store/store'

export const HardwareSimulatorView: React.FC = () => {
  const { 
    simulatePlacement,
    simulateTimeout,
    simulateNewArrival,
    workers,
    taskQueue,
    manualTask,
    manualTaskFeedback,
    clearManualTaskFeedback,
    assignManualWorker,
    moveManualWorkerToItem,
    pickManualItem,
    deliverManualItem,
    placeManualItem,
    sendManualWorkerToBase,
    addTaskToQueue
  } = useInvenioStore()

  // Predefined misplaced targets for manual override dispatching
  const [overrideWorkerId, setOverrideWorkerId] = useState<'alpha' | 'beta'>('alpha')
  const [overrideItemName, setOverrideItemName] = useState('Sprite Bottles')
  const [overrideFromShelf, setOverrideFromShelf] = useState('C1')
  const [overrideToShelf, setOverrideToShelf] = useState('C3')

  const handleStartManualTask = () => {
    assignManualWorker(overrideWorkerId, overrideItemName, overrideFromShelf, overrideToShelf)
  }

  return (
    <div className="w-full h-full p-6 flex flex-col space-y-6 overflow-y-auto bg-[#0B0B0D] text-white">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white m-0">
            Mission Control & Fleet Center
          </h2>
          <p className="text-[10px] text-[#A1A1AA] mt-1 uppercase tracking-widest">
            Simulate hardware signals, inspect task queues, and execute human-in-the-loop overrides
          </p>
        </div>
        
        <span className="text-[10px] font-mono px-3 py-1 bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20 rounded-full font-bold uppercase">
          Production Sandbox
        </span>
      </div>

      {/* Success Feedback Banner */}
      {manualTaskFeedback && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-emerald-500/25 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Manual Verification Success</h4>
              <p className="text-[10px] text-zinc-400 mt-1">
                {manualTaskFeedback.workerId.toUpperCase()} Forklift completed placement of <strong>{manualTaskFeedback.itemName}</strong> on shelf <strong>{manualTaskFeedback.correctShelfId}</strong>. Inventory state updated.
              </p>
            </div>
          </div>
          <button 
            onClick={clearManualTaskFeedback}
            className="text-[9px] font-extrabold uppercase bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded transition-all"
          >
            Acknowledge & Clear
          </button>
        </div>
      )}



      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Section: Fleet Status & Human Override controls (7 columns) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          
          {/* Worker Fleet Monitor Card */}
          <div className="bg-[#121317] p-5 rounded-xl border border-[#22252C] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#22252C]">
              <div className="flex items-center space-x-2">
                <Truck className="w-4.5 h-4.5 text-[#FF6B35]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">AGV Worker Fleet Monitor</h3>
              </div>
              <span className="text-[9px] text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2 py-0.5 rounded font-bold uppercase">
                {Object.values(workers).filter(w => w.status !== 'idle').length} units active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(workers).map(([id, worker]: [string, any]) => (
                <div 
                  key={id} 
                  className="p-3 bg-[#171A20] border border-[#22252C] rounded-lg flex flex-col space-y-2 relative overflow-hidden"
                >
                  {/* Neon border glow based on worker color */}
                  <div 
                    className="absolute top-0 left-0 w-1 h-full" 
                    style={{ backgroundColor: worker.color }}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{worker.name}</span>
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-extrabold uppercase ${
                      worker.status === 'idle' ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20' : 
                      worker.status === 'returning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                      'bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20'
                    }`}>
                      {worker.status === 'idle' ? 'Available' : 
                       worker.status === 'returning' ? 'Returning to Base' : 'Busy'}
                    </span>
                  </div>

                  <p className="text-[9px] text-zinc-400 italic">
                    {worker.label}
                  </p>

                  <div className="pt-2 border-t border-[#22252C]/60 grid grid-cols-2 gap-2 text-[9px] text-zinc-400 font-mono">
                    <div>
                      <span>Coordinates:</span>
                      <strong className="block text-white">[{worker.position[0].toFixed(1)}, {worker.position[2].toFixed(1)}]</strong>
                    </div>
                    <div>
                      <span>Payload:</span>
                      <strong className="block text-[#FF6B35] truncate">{worker.carriedItemName || 'None'}</strong>
                    </div>
                  </div>

                  {worker.status !== 'idle' && (
                    <div className="pt-2">
                      <div className="flex justify-between text-[8px] text-zinc-500 mb-1">
                        <span>Task Completion</span>
                        <span>{Math.round(worker.progress * 100)}%</span>
                      </div>
                      <div className="w-full bg-[#121317] h-1 rounded overflow-hidden">
                        <div 
                          className="h-full transition-all duration-100" 
                          style={{ width: `${worker.progress * 100}%`, backgroundColor: worker.color }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Human-in-the-loop override console */}
          <div className="bg-[#121317] p-5 rounded-xl border border-[#22252C] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#22252C]">
              <div className="flex items-center space-x-2">
                <Radio className="w-4.5 h-4.5 text-[#FF6B35]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Human-In-The-Loop Override console</h3>
              </div>
              {manualTask.step !== 'none' && (
                <span className="text-[9px] text-[#FF6B35] bg-[#FF6B35]/10 border border-[#FF6B35]/20 px-2 py-0.5 rounded font-extrabold uppercase animate-pulse">
                  Manual control locked
                </span>
              )}
            </div>

            {manualTask.step === 'none' ? (
              <div className="space-y-4">
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Intervene in the simulation state by assigning a specific misplaced inventory correction task to a worker. This locks out the background task runner for live demonstration.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Worker */}
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">Select AGV Worker</label>
                    <select
                      value={overrideWorkerId}
                      onChange={(e) => setOverrideWorkerId(e.target.value as any)}
                      className="w-full bg-[#171A20] border border-[#22252C] text-xs text-white rounded p-2 outline-none font-medium"
                    >
                      <option value="alpha">Alpha Forklift (Orange)</option>
                      <option value="beta">Beta Forklift (Purple)</option>
                    </select>
                  </div>

                  {/* Predefined tasks */}
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold block mb-1">Predefined Anomaly Resolution</label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === 'sprite') {
                          setOverrideItemName('Sprite Bottles')
                          setOverrideFromShelf('C1')
                          setOverrideToShelf('C3')
                        } else if (val === 'batteries') {
                          setOverrideItemName('Batteries')
                          setOverrideFromShelf('A1')
                          setOverrideToShelf('A3')
                        } else {
                          setOverrideItemName('Red Bull')
                          setOverrideFromShelf('B1')
                          setOverrideToShelf('B3')
                        }
                      }}
                      className="w-full bg-[#171A20] border border-[#22252C] text-xs text-white rounded p-2 outline-none font-medium"
                    >
                      <option value="sprite">Resolve Sprite Bottles (C1 → C3)</option>
                      <option value="batteries">Resolve Batteries (A1 → A3)</option>
                      <option value="redbull">Resolve Red Bull (B1 → B3)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleStartManualTask}
                  disabled={workers[overrideWorkerId]?.status !== 'idle'}
                  className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                    workers[overrideWorkerId]?.status !== 'idle'
                      ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                      : 'bg-[#FF6B35] hover:bg-orange-600 text-white'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>
                    {workers[overrideWorkerId]?.status !== 'idle'
                      ? `${overrideWorkerId.toUpperCase()} Forklift is Busy`
                      : 'Lock & Assign Manual Override Task'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active manual task steps */}
                <div className="bg-[#171A20] p-4 border border-[#FF6B35]/20 rounded-lg flex flex-col space-y-3">
                  <div className="flex items-center justify-between border-b border-[#22252C] pb-2">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                      Active Task: {manualTask.itemName}
                    </span>
                    <span className="text-[9px] text-[#FF6B35] font-mono">
                      Route: {manualTask.itemShelfId} → {manualTask.correctShelfId}
                    </span>
                  </div>

                  {/* Sequential progress step flags */}
                  <div className="grid grid-cols-4 gap-2 text-center text-[8px] font-extrabold uppercase">
                    <div className={`p-1.5 rounded border ${
                      ['assigned', 'moving_to_item'].includes(manualTask.step) 
                        ? 'bg-[#FF6B35]/15 border-[#FF6B35] text-white' : 'bg-zinc-800/40 border-[#22252C] text-zinc-500'
                    }`}>
                      1. Dispatch
                    </div>
                    <div className={`p-1.5 rounded border ${
                      ['picking', 'picked'].includes(manualTask.step) 
                        ? 'bg-[#FF6B35]/15 border-[#FF6B35] text-white' : 'bg-zinc-800/40 border-[#22252C] text-zinc-500'
                    }`}>
                      2. Pick Item
                    </div>
                    <div className={`p-1.5 rounded border ${
                      ['moving_to_shelf', 'placing'].includes(manualTask.step) 
                        ? 'bg-[#FF6B35]/15 border-[#FF6B35] text-white' : 'bg-zinc-800/40 border-[#22252C] text-zinc-500'
                    }`}>
                      3. Route
                    </div>
                    <div className={`p-1.5 rounded border ${
                      ['placed'].includes(manualTask.step) 
                        ? 'bg-[#FF6B35]/15 border-[#FF6B35] text-white' : 'bg-zinc-800/40 border-[#22252C] text-zinc-500'
                    }`}>
                      4. Complete
                    </div>
                  </div>

                  {/* Interactive Trigger Button based on active step */}
                  <div className="pt-2">
                    {/* Step 1: Assign and wait to dispatch */}
                    {manualTask.step === 'assigned' && workers[manualTask.workerId!].status === 'idle' && (
                      <button
                        onClick={() => moveManualWorkerToItem(manualTask.workerId!)}
                        className="w-full py-2 bg-[#FF6B35] hover:bg-orange-600 text-white rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
                      >
                        <span>Dispatch worker to {manualTask.itemShelfId}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}

                    {/* Step 2: Arrived at item, wait to Pick */}
                    {manualTask.step === 'moving_to_item' && workers[manualTask.workerId!].status === 'picking_item' && (
                      <button
                        onClick={() => pickManualItem(manualTask.workerId!)}
                        className="w-full py-2 bg-[#22C55E] hover:bg-emerald-600 text-white rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
                      >
                        <Cpu className="w-4 h-4" />
                        <span>Perform Hardware Scan (Pick Item)</span>
                      </button>
                    )}

                    {/* Step 3: Picking animation */}
                    {manualTask.step === 'picking' && (
                      <div className="w-full text-center py-2 bg-[#171A20] text-zinc-400 border border-[#22252C] rounded text-xs font-semibold animate-pulse">
                        Picking inventory from rack...
                      </div>
                    )}

                    {/* Step 4: Picked item, ready to deliver */}
                    {manualTask.step === 'picked' && (
                      <button
                        onClick={() => deliverManualItem(manualTask.workerId!)}
                        className="w-full py-2 bg-[#FF6B35] hover:bg-orange-600 text-white rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
                      >
                        <span>Route Worker to Shelf {manualTask.correctShelfId}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}

                    {/* Step 5: Arrived at shelf, wait to Place & Verify */}
                    {manualTask.step === 'moving_to_shelf' && workers[manualTask.workerId!].status === 'placing_item' && (
                      <button
                        onClick={() => placeManualItem(manualTask.workerId!)}
                        className="w-full py-2 bg-[#22C55E] hover:bg-emerald-600 text-white rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify Placement & Write to Database</span>
                      </button>
                    )}

                    {/* Step 6: Placing/Verifying animation */}
                    {manualTask.step === 'placing' && (
                      <div className="w-full text-center py-2 bg-[#171A20] text-zinc-400 border border-[#22252C] rounded text-xs font-semibold animate-pulse">
                        Writing block signatures to DB...
                      </div>
                    )}

                    {/* Step 7: Completed placement, return worker */}
                    {manualTask.step === 'placed' && (
                      <button
                        onClick={() => sendManualWorkerToBase(manualTask.workerId!)}
                        className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Release Lock & Return to Base Station</span>
                      </button>
                    )}

                    {/* Fallback label during movements */}
                    {['moving_to_item', 'moving_to_shelf'].includes(workers[manualTask.workerId!].status) && (
                      <div className="w-full text-center py-2 bg-[#171A20] text-[#FF6B35] border border-[#FF6B35]/25 rounded text-xs font-semibold">
                        {workers[manualTask.workerId!].label}...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Tasks Queue Visualizer & Network controls (5 columns) */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          
          {/* Task Queue Visualizer Card */}
          <div className="bg-[#121317] p-5 rounded-xl border border-[#22252C] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#22252C]">
              <div className="flex items-center space-x-2">
                <ClipboardList className="w-4.5 h-4.5 text-[#FF6B35]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Task Queue</h3>
              </div>
              <span className="text-[9px] text-zinc-500 font-mono">
                {taskQueue.length} jobs total
              </span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {taskQueue.length === 0 ? (
                <div className="py-12 border border-dashed border-[#22252C] rounded-lg text-center text-zinc-500 text-[10px]">
                  Task queue is empty. Active fleet waiting for mismatch alerts.
                </div>
              ) : (
                taskQueue.slice().reverse().map((task) => (
                  <div 
                    key={task.id} 
                    className={`p-3 rounded-lg border flex flex-col space-y-1.5 transition-colors ${
                      task.status === 'completed' ? 'bg-zinc-900/40 border-[#22252C] text-zinc-500' :
                      task.status === 'active' ? 'bg-[#FF6B35]/5 border-[#FF6B35]/30 text-white' :
                      'bg-[#171A20] border-[#22252C]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold">{task.itemName}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono uppercase font-bold border ${
                        task.type === 'manual' ? 'bg-[#FF6B35]/15 text-[#FF6B35] border-[#FF6B35]/25' : 'bg-zinc-800 text-zinc-400 border-transparent'
                      }`}>
                        {task.type}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] pt-1.5 border-t border-[#22252C]/60">
                      <div className="flex items-center space-x-1">
                        <CornerDownRight className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Route: <span className="font-mono font-bold text-zinc-350">{task.itemShelfId} → {task.correctShelfId}</span></span>
                      </div>
                      <span className={`font-bold uppercase font-mono ${
                        task.status === 'completed' ? 'text-[#22C55E]' :
                        task.status === 'active' ? 'text-[#FF6B35] animate-pulse' :
                        'text-[#F59E0B]'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick add custom simulated task to queue */}
            <button
              onClick={() => addTaskToQueue('Batteries', 'A1', 'A3')}
              className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-[#171A20] hover:bg-zinc-800 border border-[#22252C] hover:border-zinc-700 text-zinc-300 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Simulate Placement Error Task</span>
            </button>
          </div>

          {/* Quick Event Trigger Panel */}
          <div className="bg-[#121317] p-5 rounded-xl border border-[#22252C] flex flex-col space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-3 border-b border-[#22252C]">
              Sensor Signal Generator Panel
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => simulatePlacement('A3', true)}
                className="flex flex-col p-2.5 rounded bg-[#171A20] border border-[#22252C] hover:border-[#22C55E]/40 text-left transition-all"
              >
                <span className="text-[10px] font-bold text-[#22C55E]">Simulate Verified</span>
                <span className="text-[8px] text-[#A1A1AA] mt-1 leading-relaxed">
                  Shelf verified, status Green.
                </span>
              </button>

              <button
                onClick={() => simulatePlacement('A3', false)}
                className="flex flex-col p-2.5 rounded bg-[#171A20] border border-[#22252C] hover:border-[#F59E0B]/40 text-left transition-all"
              >
                <span className="text-[10px] font-bold text-[#F59E0B]">Simulate Misplaced</span>
                <span className="text-[8px] text-[#A1A1AA] mt-1 leading-relaxed">
                  Shelf pending, triggers anomaly.
                </span>
              </button>

              <button
                onClick={() => simulateTimeout('A3')}
                className="flex flex-col p-2.5 rounded bg-[#171A20] border border-[#22252C] hover:border-[#EF4444]/40 text-left transition-all"
              >
                <span className="text-[10px] font-bold text-[#EF4444]">Simulate Timeout</span>
                <span className="text-[8px] text-[#A1A1AA] mt-1 leading-relaxed">
                  Escalates shelf state to Red.
                </span>
              </button>

              <button
                onClick={simulateNewArrival}
                className="flex flex-col p-2.5 rounded bg-[#171A20] border border-[#22252C] hover:border-[#FF6B35]/40 text-left transition-all"
              >
                <span className="text-[10px] font-bold text-[#FF6B35]">Simulate New Arrival</span>
                <span className="text-[8px] text-[#A1A1AA] mt-1 leading-relaxed">
                  Registers new stock at dock.
                </span>
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
