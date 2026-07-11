import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Terminal, 
  Cpu, 
  Package, 
  ActivitySquare, 
  DollarSign, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  Radio
} from "lucide-react";
import api from "../api/client.js";

export default function OrchestratorSpace() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [finalReport, setFinalReport] = useState(null);
  const [useLangGraph, setUseLangGraph] = useState(false);

  const getAgentIcon = (agentName) => {
    if (agentName.includes("Supply")) return <Package size={16} className="text-rose-500" />;
    if (agentName.includes("Schedule")) return <ActivitySquare size={16} className="text-amber-500" />;
    if (agentName.includes("Cost")) return <DollarSign size={16} className="text-indigo-500" />;
    if (agentName.includes("Commissioning")) return <ShieldCheck size={16} className="text-purple-500" />;
    if (agentName.includes("Orchestrator")) return <Cpu size={16} className="text-teal-500" />;
    if (agentName.includes("RabbitMQ")) return <Radio size={16} className="text-blue-400 animate-pulse" />;
    return <Terminal size={16} className="text-slate-500" />;
  };

  const triggerShock = async () => {
    setIsRunning(true);
    setLogs([]);
    setFinalReport(null);
    
    // Simulate delay to make the UI look like it's processing sequentially
    const addLogWithDelay = (log, index) => {
      setTimeout(() => {
        setLogs(prev => [...prev, log]);
        if (index === 0) {
            // After first log, add a small delay before the rest
        }
      }, index * 1200); // 1.2s delay between each agent call for dramatic effect
    };

    try {
      const payload = { item_name: "UPS - 500kVA", delay_weeks: 14 };
      const apiCall = useLangGraph ? api.triggerSupplyChainShockLangGraph : api.triggerSupplyChainShock;
      const res = await apiCall(payload);
      
      const { execution_log, final_report } = res.data;
      
      execution_log.forEach((log, i) => {
        addLogWithDelay(log, i);
      });

      // Show final report after all logs
      setTimeout(() => {
        setFinalReport(final_report);
        setIsRunning(false);
      }, execution_log.length * 1200 + 500);

    } catch (error) {
      console.error(error);
      setIsRunning(false);
      setLogs([{
        agent: "System Error",
        message: "Failed to connect to Orchestrator API.",
        timestamp: new Date().toISOString()
      }]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Orchestrator Space</h1>
          <p className="text-sm text-slate-500 mt-1">
            Observe the multi-agent AI framework dynamically reacting to project events in real-time.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setUseLangGraph(false)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                !useLangGraph ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Custom Engine
            </button>
            <button
              onClick={() => setUseLangGraph(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                useLangGraph ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              LangGraph Engine
            </button>
          </div>

          <button
            onClick={triggerShock}
            disabled={isRunning}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              useLangGraph 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700' 
                : 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700'
            }`}
          >
            {isRunning ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play size={16} />
            )}
            Simulate Shock
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Live Logs Terminal */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col min-h-[500px]">
          <div className="h-10 bg-slate-950 border-b border-slate-800 flex items-center px-4 gap-2 shrink-0">
            <Terminal size={14} className="text-slate-500" />
            <span className="text-xs font-mono text-slate-400">orchestrator_kernel_v2.log</span>
            <div className="ml-auto flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
            </div>
          </div>
          
          <div className="flex-1 p-5 font-mono text-sm overflow-y-auto custom-scrollbar">
            {logs.length === 0 && !isRunning && (
              <div className="text-slate-600 italic">Waiting for events... Press 'Simulate Supply Chain Shock' to begin.</div>
            )}
            
            <AnimatePresence>
              {logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                      {getAgentIcon(log.agent)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-300">{log.agent}</span>
                        <span className="text-slate-600 text-xs">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      </div>
                      <div className="text-emerald-400 mt-1">{log.message}</div>
                      {log.data && (
                        <div className="mt-2 bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-400 text-xs overflow-x-auto">
                          <pre>{JSON.stringify(log.data, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isRunning && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="flex items-center gap-2 text-slate-500 mt-4"
                >
                  <div className="w-1.5 h-4 bg-emerald-500 animate-pulse" />
                  Processing...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Synthesis Report */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm min-h-[200px]">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Cpu size={18} className="text-teal-500" />
              Executive Synthesis
            </h3>
            
            {!finalReport ? (
              <div className="text-sm text-slate-500 italic text-center py-8">
                {isRunning ? "Orchestrator compiling insights..." : "No active reports."}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className={`p-3 rounded-xl border flex items-start gap-3 ${
                  finalReport.alert_level === 'CRITICAL' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <AlertTriangle size={18} className={finalReport.alert_level === 'CRITICAL' ? 'text-rose-600 mt-0.5' : 'text-amber-600 mt-0.5'} />
                  <div>
                    <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                       finalReport.alert_level === 'CRITICAL' ? 'text-rose-700' : 'text-amber-700'
                    }`}>
                      {finalReport.alert_level} ALERT
                    </div>
                    <div className="text-sm text-slate-800 leading-relaxed">
                      {finalReport.summary}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recommended Actions</div>
                  <ul className="space-y-2">
                    {finalReport.actions.map((act, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </div>
          
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-2 text-sm">How this works</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Unlike traditional dashboards, the Master Orchestrator intercepts raw events (e.g. a delayed ship via API) and autonomously triggers a chain reaction of specialized AI agents. It calculates schedule slip, estimates financial LDs, flags compliance issues, and formulates a mitigation plan entirely without human input.
            </p>
            {useLangGraph && (
              <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-800">
                <strong className="block mb-1">🧠 LangGraph Engine Active</strong>
                This execution was powered by a formal LangChain StateGraph, where each agent acts as a node modifying the global state dictionary before compiling the final synthesis.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
