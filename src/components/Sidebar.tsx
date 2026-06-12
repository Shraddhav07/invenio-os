import React from 'react'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, Map, List, HelpCircle, 
  BarChart3, ShieldAlert, Terminal
} from 'lucide-react'
import { useInvenioStore } from '../store/store'

export const Sidebar: React.FC = () => {
  const { 
    activeRoute, 
    setRoute, 
    demoMode, 
    setDemoMode
  } = useInvenioStore()

  // Navigation Items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'twin', label: 'Digital Twin', icon: Map },
    { id: 'inventory', label: 'Inventory', icon: List },
    { id: 'assistant', label: 'AI Search', icon: HelpCircle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'alerts', label: 'Alerts', icon: ShieldAlert },
    { id: 'simulator', label: 'Mission Control', icon: Terminal }
  ] as const


  return (
    <div className="w-64 h-full flex flex-col bg-[#121317] border-r border-[#22252C] text-[#A1A1AA] select-none">
      {/* Brand Logo Header */}
      <div className="p-5 flex items-center space-x-3 border-b border-[#22252C]">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF6B35]/10 border border-[#FF6B35]/30">
          {/* Stylized geometric box logo */}
          <svg className="w-4 h-4 text-[#FF6B35]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wider text-white m-0 leading-none">
            INVENIO <span className="text-[#FF6B35] font-semibold text-xs">OS</span>
          </h1>
          <p className="text-[9px] uppercase tracking-widest text-[#A1A1AA] mt-1 leading-none">
            Warehouse Intelligence
          </p>
        </div>
      </div>

      {/* Demo Mode Controller */}
      <div className="mx-4 my-3 p-3 rounded-lg bg-[#171A20] border border-[#22252C] flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white">
            Demo Mode
          </div>
          <div className="text-[9px] text-[#A1A1AA] mt-0.5">
            {demoMode ? 'Live events generating' : 'Simulation paused'}
          </div>
        </div>
        <button 
          onClick={() => setDemoMode(!demoMode)}
          className={`relative w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
            demoMode ? 'bg-[#FF6B35]' : 'bg-[#22252C]'
          }`}
        >
          <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            demoMode ? 'translate-x-3.5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeRoute === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => setRoute(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all relative ${
                isActive 
                  ? 'text-white bg-[#171A20] border border-[#22252C] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#171A20]/40 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3 z-10">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF6B35]' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </div>
              
              {item.id === 'alerts' && (
                <AlertBadge />
              )}

              {isActive && (
                <motion.div 
                  layoutId="activePill" 
                  className="absolute left-1 w-0.5 h-5 rounded bg-[#FF6B35]" 
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// Badge indicating number of unresolved critical alerts
const AlertBadge: React.FC = () => {
  const alertsCount = useInvenioStore(state => state.alerts.filter(a => !a.resolved && a.severity === 'critical').length)
  if (alertsCount === 0) return null
  
  return (
    <span className="bg-[#EF4444]/20 text-[#EF4444] text-[9px] font-semibold px-1.5 py-0.5 rounded-full border border-[#EF4444]/30">
      {alertsCount}
    </span>
  )
}
