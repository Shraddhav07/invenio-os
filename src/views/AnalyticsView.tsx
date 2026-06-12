import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Clock, Box, ShieldAlert } from 'lucide-react'

export const AnalyticsView: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week')
  
  const getCapacityData = () => [
    { zone: 'Zone A', used: 62, cap: 1500, label: 'General Storage' },
    { zone: 'Zone B', used: 48, cap: 2000, label: 'Small Parts' },
    { zone: 'Zone C', used: 85, cap: 1200, label: 'High Racks' },
    { zone: 'Hazard', used: 30, cap: 400, label: 'Ventilated unit' },
    { zone: 'Cold Storage', used: 72, cap: 300, label: 'Refrigerated Unit' }
  ]

  const getPickTimeHistory = () => {
    if (timeframe === 'day') return [
      { label: '08:00', val: 8.5 },
      { label: '10:00', val: 12.2 },
      { label: '12:00', val: 14.8 },
      { label: '14:00', val: 9.3 },
      { label: '16:00', val: 11.5 },
      { label: '18:00', val: 7.4 }
    ]
    if (timeframe === 'week') return [
      { label: 'Mon', val: 12.4 },
      { label: 'Tue', val: 11.2 },
      { label: 'Wed', val: 14.5 },
      { label: 'Thu', val: 9.8 },
      { label: 'Fri', val: 10.6 },
      { label: 'Sat', val: 8.2 },
      { label: 'Sun', val: 7.5 }
    ]
    return [
      { label: 'Jan', val: 15.2 },
      { label: 'Feb', val: 13.8 },
      { label: 'Mar', val: 12.1 },
      { label: 'Apr', val: 11.4 },
      { label: 'May', val: 9.9 },
      { label: 'Jun', val: 9.5 }
    ]
  }

  const capacity = getCapacityData()
  const pickTimes = getPickTimeHistory()
  const maxVal = Math.max(...pickTimes.map(p => p.val))

  return (
    <div className="w-full h-full p-6 flex flex-col space-y-6 overflow-y-auto bg-[#0B0B0D] text-white">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white m-0">
            Logistics Analytics
          </h2>
          <p className="text-[10px] text-[#A1A1AA] mt-1 uppercase tracking-widest">
            Storage capacity & operations performance index
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex items-center space-x-2 bg-[#121317] p-1 rounded-lg border border-[#22252C] text-xs">
          <button 
            onClick={() => setTimeframe('day')}
            className={`px-3 py-1.5 rounded transition-colors ${timeframe === 'day' ? 'bg-[#FF6B35] text-white font-semibold' : 'text-[#A1A1AA] hover:text-white'}`}
          >
            Today
          </button>
          <button 
            onClick={() => setTimeframe('week')}
            className={`px-3 py-1.5 rounded transition-colors ${timeframe === 'week' ? 'bg-[#FF6B35] text-white font-semibold' : 'text-[#A1A1AA] hover:text-white'}`}
          >
            Week
          </button>
          <button 
            onClick={() => setTimeframe('month')}
            className={`px-3 py-1.5 rounded transition-colors ${timeframe === 'month' ? 'bg-[#FF6B35] text-white font-semibold' : 'text-[#A1A1AA] hover:text-white'}`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Main split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Storage utilization chart (Left Column) */}
        <div className="lg:col-span-6 bg-[#121317] p-5 rounded-xl border border-[#22252C] flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-[#22252C]">
              <Box className="w-4 h-4 text-[#FF6B35]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Spatial Capacity Utilization</h3>
            </div>
            <p className="text-[10px] text-[#A1A1AA] mt-2">Active volume allocation relative to zone thresholds.</p>
          </div>

          <div className="space-y-4 my-4">
            {capacity.map((cap) => (
              <div key={cap.zone} className="flex flex-col space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-300 font-bold">{cap.zone} <span className="text-zinc-500 font-normal ml-1">({cap.label})</span></span>
                  <span className="font-mono text-zinc-400">{cap.used}% <span className="text-zinc-500">/ {cap.cap} units max</span></span>
                </div>
                <div className="w-full bg-[#171A20] h-2 rounded-full overflow-hidden border border-[#22252C]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${cap.used}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      cap.zone.includes('Hazard') ? 'bg-[#EF4444]' :
                      cap.zone.includes('Cold') ? 'bg-[#FF6B35]' :
                      'bg-zinc-500'
                    }`} 
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-[10px] text-[#A1A1AA] pt-3 border-t border-[#22252C]">
            <span>Mean Utilization: <strong>59.4%</strong></span>
            <span>Capacity Buffer: <strong>Healthy</strong></span>
          </div>
        </div>

        {/* Pick time bar chart (Right Column) */}
        <div className="lg:col-span-6 bg-[#121317] p-5 rounded-xl border border-[#22252C] flex flex-col justify-between h-[360px]">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-[#22252C]">
              <Clock className="w-4.5 h-4.5 text-[#FF6B35]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Average Pick Duration</h3>
            </div>
            <p className="text-[10px] text-[#A1A1AA] mt-2">Duration in minutes for packaging and transport dispatch.</p>
          </div>

          {/* Bar rendering */}
          <div className="flex items-end justify-between h-44 px-4 my-2 border-b border-[#22252C] pb-2">
            {pickTimes.map((item) => {
              const heightPct = (item.val / maxVal) * 100
              return (
                <div key={item.label} className="flex flex-col items-center space-y-2 group cursor-pointer">
                  {/* Hover tooltip value */}
                  <span className="text-[10px] font-mono text-[#FF6B35] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {item.val}m
                  </span>
                  {/* The bar */}
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="w-8 rounded-t bg-[#FF6B35]/20 border border-[#FF6B35]/40 group-hover:border-[#FF6B35] group-hover:bg-[#FF6B35]/40 transition-all"
                  />
                  <span className="text-[10px] text-[#A1A1AA] font-mono font-medium">{item.label}</span>
                </div>
              )
            })}
          </div>

          <div className="flex justify-between text-[10px] text-[#A1A1AA] pt-1">
            <span>Overall Avg: <strong>10.2 min</strong></span>
            <span>Target Thresh: <strong>&lt; 12.0 min</strong></span>
          </div>
        </div>

      </div>

      {/* Dynamic bottom metrics summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#121317] p-4 rounded-xl border border-[#22252C] flex items-center space-x-4">
          <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-lg text-[#EF4444]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-[#A1A1AA] font-semibold uppercase tracking-wider">Placement Anomalies</div>
            <div className="text-sm font-bold text-white mt-1 font-mono">0.08% <span className="text-[#22C55E] text-[10px] font-normal">(-14% MoM)</span></div>
          </div>
        </div>

        <div className="bg-[#121317] p-4 rounded-xl border border-[#22252C] flex items-center space-x-4">
          <div className="p-3 bg-[#22C55E]/10 border border-[#22C55E]/25 rounded-lg text-[#22C55E]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-[#A1A1AA] font-semibold uppercase tracking-wider">Throughput Trend</div>
            <div className="text-sm font-bold text-white mt-1 font-mono">+8.4% <span className="text-[#FF6B35] text-[10px] font-normal">Upward</span></div>
          </div>
        </div>

        <div className="bg-[#121317] p-4 rounded-xl border border-[#22252C] flex items-center space-x-4">
          <div className="p-3 bg-[#FF6B35]/10 border border-[#FF6B35]/25 rounded-lg text-[#FF6B35]">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-[#A1A1AA] font-semibold uppercase tracking-wider">Optimization Index</div>
            <div className="text-sm font-bold text-white mt-1 font-mono">94.8% <span className="text-[#FF6B35] text-[10px] font-normal">Highly optimal</span></div>
          </div>
        </div>
      </div>

    </div>
  )
}
