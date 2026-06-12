import React, { useState } from 'react'
import { Settings, Database, Sliders, ShieldCheck } from 'lucide-react'
import { useInvenioStore } from '../store/store'

export const SettingsView: React.FC = () => {
  const { addCustomAlert } = useInvenioStore()
  
  const [mqttHost, setMqttHost] = useState('mqtt.invenio.local')
  const [mqttPort, setMqttPort] = useState('1883')
  const [dbHost, setDbHost] = useState('postgresql://db.invenio.internal/warehouse')
  
  const handleSaveConfigs = (e: React.FormEvent) => {
    e.preventDefault()
    addCustomAlert('info', `Saved network configuration. Reconnecting brokers...`)
  }

  return (
    <div className="w-full h-full p-6 flex flex-col space-y-6 overflow-y-auto bg-[#0B0B0D] text-white">
      
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-[#22252C]">
        <Settings className="w-5 h-5 text-[#FF6B35]" />
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white m-0">
            System Settings
          </h2>
          <p className="text-[10px] text-[#A1A1AA] mt-1 uppercase tracking-widest">
            Configure local gateway settings and client parameters
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Core settings (Left column) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Theme card */}
          <div className="bg-[#121317] p-5 rounded-xl border border-[#22252C] space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-[#FF6B35]" />
              <span>Display Preference</span>
            </h3>
            
            <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
              <div>
                <span className="font-semibold block text-white">Application Mode Theme</span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Locked to dark mode for operational clarity.</span>
              </div>
              
              <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-[#0B0B0D] border border-[#22252C] text-xs font-semibold text-white">
                Enterprise Dark Mode
              </div>
            </div>
          </div>

          {/* Telemetry settings */}
          <div className="bg-[#121317] p-5 rounded-xl border border-[#22252C] space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Database className="w-4 h-4 text-[#FF6B35]" />
              <span>NFC Network Configuration</span>
            </h3>

            <form onSubmit={handleSaveConfigs} className="space-y-4 text-xs text-[#A1A1AA]">
              <div className="flex flex-col space-y-1">
                <label className="text-zinc-400">MQTT Broker Address</label>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value={mqttHost}
                    onChange={(e) => setMqttHost(e.target.value)}
                    className="flex-1 bg-[#171A20] border border-[#22252C] rounded px-3 py-2 text-white outline-none focus:border-[#FF6B35]"
                  />
                  <input 
                    type="text" 
                    value={mqttPort}
                    onChange={(e) => setMqttPort(e.target.value)}
                    className="w-20 bg-[#171A20] border border-[#22252C] rounded px-3 py-2 text-white outline-none text-center font-mono focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-zinc-400">Postgres Connection URI</label>
                <input 
                  type="text" 
                  value={dbHost}
                  onChange={(e) => setDbHost(e.target.value)}
                  className="bg-[#171A20] border border-[#22252C] rounded px-3 py-2 text-white outline-none font-mono focus:border-[#FF6B35]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit"
                  className="px-4 py-2 rounded bg-[#FF6B35] text-white font-bold hover:bg-[#E05626] transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Informational settings (Right column) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[#121317] p-5 rounded-xl border border-[#22252C] space-y-3.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">System Information</h3>
            
            <div className="space-y-2 text-xs text-[#A1A1AA] leading-relaxed">
              <p>
                <strong>Invenio OS</strong> is deployed as an enterprise warehouse operating interface connecting to physical sensor grids. 
              </p>
              <div className="p-3 bg-[#0B0B0D] rounded border border-[#22252C] space-y-1.5 text-[10px]">
                <div className="flex justify-between">
                  <span>Client build:</span>
                  <span className="font-mono text-zinc-400">v1.4.2-production</span>
                </div>
                <div className="flex justify-between">
                  <span>Tauri engine:</span>
                  <span className="font-mono text-zinc-400">v2.0.4</span>
                </div>
                <div className="flex justify-between">
                  <span>ThreeJS renderer:</span>
                  <span className="font-mono text-[#FF6B35]">WebGL 2.0</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-[#22C55E] bg-[#22C55E]/5 p-2.5 rounded border border-[#22C55E]/10 mt-2">
                <ShieldCheck className="w-4 h-4" />
                <span>NFC sensors running securely on private subnet.</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
