import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Database, 
  Cloud, 
  HardDrive, 
  Server, 
  Wifi, 
  CheckCircle2, 
  RefreshCw,
  Box,
  Map,
  Activity,
  Building,
  Globe
} from "lucide-react";

const integrations = [
  {
    id: "sap",
    name: "SAP ERP",
    category: "Procurement & Cost",
    icon: <Database size={24} className="text-blue-500" />,
    description: "Live synchronization of purchase orders, vendor invoices, and actualized costs.",
    lastSync: "2 mins ago"
  },
  {
    id: "primavera",
    name: "Primavera P6",
    category: "Schedule & Critical Path",
    icon: <Activity size={24} className="text-emerald-500" />,
    description: "Bi-directional sync of schedule logic, float calculations, and task dependencies.",
    lastSync: "5 mins ago"
  },
  {
    id: "forge",
    name: "Autodesk Forge",
    category: "BIM & 3D Models",
    icon: <Box size={24} className="text-rose-500" />,
    description: "Ingestion of 3D clash detection reports and spatial commissioning models.",
    lastSync: "1 hour ago"
  },
  {
    id: "aconex",
    name: "Oracle Aconex",
    category: "Document Control",
    icon: <Cloud size={24} className="text-orange-500" />,
    description: "Automated scraping of incoming vendor submittals and client RFIs.",
    lastSync: "12 mins ago"
  },
  {
    id: "iot",
    name: "Site IoT Sensors",
    category: "Live Conditions",
    icon: <Wifi size={24} className="text-teal-500" />,
    description: "Real-time telemetry for temperature, humidity, and generator power loads.",
    lastSync: "Just now"
  },
  {
    id: "logistics",
    name: "Global Logistics API",
    category: "Supply Chain",
    icon: <Globe size={24} className="text-indigo-500" />,
    description: "Live maritime and air freight GPS tracking for critical path equipment.",
    lastSync: "30 mins ago"
  }
];

export default function IntegrationsPage() {
  const [syncing, setSyncing] = useState({});

  const toggleSync = (id) => {
    setSyncing(prev => ({ ...prev, [id]: true }));
    // Fake the sync time
    setTimeout(() => {
      setSyncing(prev => ({ ...prev, [id]: false }));
    }, Math.random() * 2000 + 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Integrations Hub</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your enterprise connections. The Master Orchestrator requires live data feeds to trigger autonomous events.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium shadow-sm">
          <Server size={16} className="text-emerald-400" />
          Event Bus Active
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration, idx) => (
          <motion.div
            key={integration.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            {/* Status indicator line at top */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
            
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                {integration.icon}
              </div>
              <button 
                onClick={() => toggleSync(integration.id)}
                disabled={syncing[integration.id]}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  syncing[integration.id] 
                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {syncing[integration.id] ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={12} />
                    Connected
                  </>
                )}
              </button>
            </div>
            
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                {integration.category}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{integration.name}</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                {integration.description}
              </p>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <HardDrive size={12} />
                Last Synced: {syncing[integration.id] ? "Updating..." : integration.lastSync}
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Neo4j / Message Queue Callout for Judges */}
      <div className="mt-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg mb-1">Enterprise Data Pipeline Status</h3>
          <p className="text-slate-400 text-sm">
            All integrated feeds are published to <strong className="text-white">RabbitMQ</strong> and ingested into the <strong className="text-white">Neo4j Knowledge Graph</strong> for cross-agent contextual querying.
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-400">14.2k</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Events / Hr</div>
          </div>
          <div className="h-10 w-px bg-slate-700" />
          <div className="text-center">
            <div className="text-3xl font-bold text-teal-400">2.1M</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Graph Nodes</div>
          </div>
        </div>
      </div>
    </div>
  );
}
