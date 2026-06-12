import React, { useState } from 'react'
import { AlertTriangle, Bell, Clock, ShieldCheck, Check, Navigation } from 'lucide-react'
import { useInvenioStore } from '../store/store'

export const AlertsView: React.FC = () => {
  const { alerts, resolveAlert, assignWorkerToFixAlert } = useInvenioStore()
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all')

  const getFilteredAlerts = () => {
    if (filter === 'all') return alerts
    return alerts.filter(a => a.severity === filter)
  }

  const activeAlerts = getFilteredAlerts()

  return (
    <div className="w-full h-full p-6 flex flex-col space-y-6 overflow-y-auto bg-[#0B0B0D] text-white">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white m-0">
            System Alerts
          </h2>
          <p className="text-[10px] text-[#A1A1AA] mt-1 uppercase tracking-widest">
            Inspect physical hardware exceptions and route anomalies
          </p>
        </div>
        
        {/* Toggle options */}
        <div className="flex items-center space-x-2 bg-[#121317] p-1 rounded-lg border border-[#22252C] text-xs">
          <button 
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded transition-colors ${filter === 'all' ? 'bg-[#FF6B35] text-white font-semibold' : 'text-[#A1A1AA] hover:text-white'}`}
          >
            All Alerts
          </button>
          <button 
            onClick={() => setFilter('critical')}
            className={`px-3 py-1.5 rounded transition-colors ${filter === 'critical' ? 'bg-[#FF6B35] text-white font-semibold' : 'text-[#A1A1AA] hover:text-white'}`}
          >
            Critical
          </button>
          <button 
            onClick={() => setFilter('warning')}
            className={`px-3 py-1.5 rounded transition-colors ${filter === 'warning' ? 'bg-[#FF6B35] text-white font-semibold' : 'text-[#A1A1AA] hover:text-white'}`}
          >
            Warnings
          </button>
        </div>
      </div>

      {/* Stats Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#121317] p-5 rounded-xl border border-[#22252C] flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-[#EF4444]">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#A1A1AA] block font-semibold">Critical exceptions</span>
              <span className="text-sm font-extrabold text-white mt-1 font-mono block">
                {alerts.filter(a => a.severity === 'critical').length} Active
              </span>
            </div>
          </div>
          <span className="text-[10px] text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded border border-[#EF4444]/20 uppercase tracking-widest font-bold">Action Required</span>
        </div>

        <div className="bg-[#121317] p-5 rounded-xl border border-[#22252C] flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl text-[#F59E0B]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#A1A1AA] block font-semibold">Verification Warnings</span>
              <span className="text-sm font-extrabold text-white mt-1 font-mono block">
                {alerts.filter(a => a.severity === 'warning').length} Awaiting
              </span>
            </div>
          </div>
          <span className="text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded border border-[#F59E0B]/20 uppercase tracking-widest font-bold">Monitor State</span>
        </div>
      </div>

      {/* Alerts Logs Container */}
      <div className="bg-[#121317] rounded-xl border border-[#22252C] p-5 flex flex-col space-y-4">
        <span className="text-[10px] uppercase tracking-widest text-[#A1A1AA] font-semibold">Active Incident Register</span>

        {activeAlerts.length === 0 ? (
          <div className="py-20 text-center text-[#A1A1AA] border border-dashed border-[#22252C] rounded-xl flex flex-col items-center">
            <ShieldCheck className="w-8 h-8 text-[#22C55E] mb-2" />
            <span className="text-xs font-semibold text-white">All Systems Operational</span>
            <span className="text-[10px] text-zinc-650 mt-1">Scanning arrays report zero misplaced products.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  alert.severity === 'critical' 
                    ? 'bg-[#EF4444]/5 border-[#EF4444]/25' 
                    : 'bg-[#F59E0B]/5 border-[#F59E0B]/25'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    alert.severity === 'critical' ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-white">
                      {alert.message}
                    </div>
                    <div className="flex items-center space-x-2.5 text-[10px] text-[#A1A1AA]">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Raised: {alert.timestamp}</span>
                      </div>
                      {alert.shelfId && (
                        <span>• Shelf ID: <span className="font-mono text-zinc-400 font-semibold">{alert.shelfId}</span></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-auto">
                  {alert.severity === 'critical' && (
                    <>
                      <button
                        onClick={() => assignWorkerToFixAlert(alert.id, 'best')}
                        className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded bg-[#FF6B35] hover:bg-[#FF8A5B] text-xs font-bold text-black transition-all shadow-md shadow-[#FF6B35]/10"
                      >
                        <Navigation className="w-3.5 h-3.5 fill-current" />
                        <span>Fix Automatically</span>
                      </button>

                      <div className="flex items-center space-x-1 bg-[#171A20] rounded border border-[#22252C] p-0.5 h-[30px]">
                        <button
                          onClick={() => assignWorkerToFixAlert(alert.id, 'alpha')}
                          className="px-2 py-1 hover:bg-zinc-800 rounded text-[10px] text-zinc-300 font-mono hover:text-[#FF6B35] transition"
                          title="Assign Alpha Forklift"
                        >
                          Alpha
                        </button>
                        <button
                          onClick={() => assignWorkerToFixAlert(alert.id, 'beta')}
                          className="px-2 py-1 hover:bg-zinc-800 rounded text-[10px] text-zinc-300 font-mono hover:text-[#FF6B35] transition"
                          title="Assign Beta Forklift"
                        >
                          Beta
                        </button>
                      </div>
                    </>
                  )}

                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="flex items-center justify-center space-x-2 px-3 py-1.5 rounded bg-[#171A20] hover:bg-[#22252C] text-xs font-bold text-white border border-[#22252C] transition-all h-[30px]"
                  >
                    <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>Resolve</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
