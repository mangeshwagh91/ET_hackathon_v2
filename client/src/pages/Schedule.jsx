import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Calendar, AlertTriangle, CheckCircle, Activity, ChevronDown, ChevronUp, Zap, Clock } from "lucide-react";
import api from "../api/client.js";
import SeverityBadge from "../components/SeverityBadge.jsx";
import ComplianceBackground from "../components/compliance/ComplianceBackground.jsx";
import ScheduleUploadCard from "../components/schedule/ScheduleUploadCard.jsx";
import ScheduleAITimeline from "../components/schedule/ScheduleAITimeline.jsx";
import EmptyState from "../components/EmptyState.jsx";

// ─── KPI Counters ─────────────────────────────────────────────────────────────
function AnimatedCounter({ value, suffix = "" }) {
  return <span>{value}{suffix}</span>;
}

export default function Schedule() {
  const [tasks, setTasks] = useState([]);
  const [delayData, setDelayData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [scheduleFile, setScheduleFile] = useState(null);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const data = await api.getScheduleTasks();
      setTasks(data.tasks || []);
      // Also load delay comparison
      try {
        const dc = await api.getDelayComparison();
        setDelayData(dc);
      } catch (_) {}
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAnalyze() {
    try {
      setAnalyzing(true);
      setError(null);
      await api.analyzeSchedule();
      await loadTasks();
      setStatusMsg("✓ Analysis complete");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      setError(err.message);
      setStatusMsg("");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleImport(e) {
    const file = e.target?.files?.[0] || scheduleFile;
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      setImporting(true);
      setError(null);
      await api.importSchedule(formData);
      await loadTasks();
      setStatusMsg("✓ Schedule imported successfully");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      setError(err.message);
      setStatusMsg("");
    } finally {
      setImporting(false);
      setScheduleFile(null); // Reset upload card after success
    }
  }

  function getRiskLevel(score) {
    if (score >= 0.75) return "HIGH";
    if (score >= 0.5) return "MEDIUM";
    return "LOW";
  }

  const criticalTasksCount = tasks.filter(t => t.total_float_days === 0).length;
  const avgRisk = tasks.length ? Math.round((tasks.reduce((acc, t) => acc + t.risk_score, 0) / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen relative pb-24">
      <ComplianceBackground />
      
      <div className="max-w-7xl mx-auto px-4 pt-12 relative z-10">
        
        {/* ─── Hero Section ────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-200 bg-sky-50/80 backdrop-blur-sm mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-sky-700">Project Scheduler</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
            Schedule Risk Intelligence
          </h1>
          <p className="text-lg text-slate-600 mt-4 max-w-2xl">
            Upload project schedules and let AI identify critical paths, predict delays, and automatically recommend mitigation strategies before project impacts occur.
          </p>
          
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { label: "Total Tasks", val: tasks.length || 0, icon: <Calendar size={18} />, color: "text-blue-600" },
              { label: "Critical Path", val: criticalTasksCount, icon: <Zap size={18} />, color: "text-amber-600" },
              { label: "Overall Risk", val: avgRisk, suffix: "%", icon: <AlertTriangle size={18} />, color: avgRisk > 50 ? "text-red-500" : "text-green-500" },
              { label: "AI Status", val: "Online", icon: <Activity size={18} />, color: "text-emerald-500" }
            ].map((kpi, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 * i }}
                whileHover={{ y: -2 }}
                className="bg-white/60 backdrop-blur-md border border-white/40 p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
              >
                <div className={`mb-3 ${kpi.color}`}>{kpi.icon}</div>
                <div className="text-3xl font-bold text-slate-800 tracking-tight"><AnimatedCounter value={kpi.val} suffix={kpi.suffix} /></div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">{kpi.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Global Error/Status Toast */}
        <AnimatePresence>
          {(error || statusMsg) && !analyzing && !importing && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`mb-8 p-4 rounded-xl border backdrop-blur-md font-medium text-sm shadow-sm ${
                error ? "bg-red-50/80 border-red-200 text-red-700" : "bg-sky-50/80 border-sky-200 text-sky-700"
              }`}
            >
              {error || statusMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ─── Left Panel: Upload & Analyze ──────────────────────────── */}
          <div className="lg:col-span-4 space-y-6">
            <ScheduleUploadCard 
              file={scheduleFile}
              setFile={setScheduleFile}
              onUpload={handleImport}
              isUploading={importing}
            />

            <motion.div 
              className={`transition-all duration-300 ${tasks.length === 0 ? "opacity-50 pointer-events-none" : ""}`}
            >
              <button
                onClick={handleAnalyze}
                disabled={analyzing || tasks.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl p-6 shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <Play fill="currentColor" size={24} />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg">Run AI Risk Analysis</h3>
                  <p className="text-indigo-200 text-xs font-medium">Predict delays and generate mitigations</p>
                </div>
              </button>
            </motion.div>
          </div>

          {/* ─── Center/Right Panel: Results Dashboard ─────────────────── */}
          <div className="lg:col-span-8 relative">
            <AnimatePresence mode="wait">
              {analyzing ? (
                <motion.div key="processing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, filter: "blur(10px)" }}>
                  <ScheduleAITimeline />
                </motion.div>
              ) : tasks.length > 0 ? (
                <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  
                  {/* Interactive Mock Timeline (Gantt style) */}
                  <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Critical Path Visualization</h2>
                        <p className="text-sm text-slate-500">Interactive dependency graph and schedule float</p>
                      </div>
                      <div className="flex gap-4 text-xs font-semibold">
                        <span className="flex items-center gap-1 text-slate-500"><div className="w-3 h-3 rounded-sm bg-slate-200"></div> Float</span>
                        <span className="flex items-center gap-1 text-red-500"><div className="w-3 h-3 rounded-sm bg-red-400"></div> Critical</span>
                      </div>
                    </div>
                    
                    <div className="relative h-40 border-l border-b border-slate-200 mt-4 px-2 pt-2">
                      {/* Timeline tracks (Mocked for visual effect) */}
                      {tasks.slice(0, 4).map((task, idx) => {
                        const isCritical = task.total_float_days === 0;
                        const width = 20 + Math.random() * 30; // Random width for mock visual
                        const left = idx * 15;
                        return (
                          <motion.div 
                            key={`mock-timeline-${task.id}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${width}%` }}
                            transition={{ duration: 1, delay: idx * 0.2 }}
                            className={`h-6 rounded-md mb-3 relative flex items-center px-2 text-[10px] font-bold text-white truncate shadow-sm cursor-pointer hover:brightness-90 ${isCritical ? 'bg-red-400' : 'bg-slate-400'}`}
                            style={{ marginLeft: `${left}%` }}
                          >
                            {task.task_code}
                            {/* Connecting Line */}
                            {idx < 3 && <div className="absolute top-full left-1/2 w-px h-3 bg-slate-300" />}
                            {idx < 3 && <div className="absolute top-[30px] left-1/2 h-px bg-slate-300" style={{ width: '15vw' }} />}
                          </motion.div>
                        );
                      })}
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
                        {[1,2,3,4,5].map(i => <div key={i} className="h-full w-px bg-slate-400" />)}
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendations & Task Table */}
                  <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl overflow-hidden shadow-lg">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-bold text-slate-700">Detailed Risk Analysis</h3>
                      <span className="text-xs font-semibold bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-500">Sorted by Priority</span>
                    </div>
                    
                    <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                      {/* Sort tasks: critical first, then by risk */}
                      {[...tasks].sort((a,b) => b.risk_score - a.risk_score).map((task, idx) => {
                        const isExpanded = expandedTaskId === task.id;
                        const isCritical = task.total_float_days === 0;
                        
                        return (
                          <motion.div 
                            key={task.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 * idx }}
                            className={`transition-colors ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                          >
                            {/* Task Row */}
                            <div 
                              onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                              className="px-6 py-4 flex items-center gap-4 cursor-pointer"
                            >
                              <div className={`w-2 h-2 rounded-full ${isCritical ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="font-mono text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 rounded">{task.task_code}</span>
                                  <SeverityBadge severity={getRiskLevel(task.risk_score)} />
                                </div>
                                <h4 className="font-semibold text-slate-800 truncate text-sm">{task.description}</h4>
                              </div>
                              
                              <div className="text-right mr-4 hidden md:block">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Float</p>
                                <p className={`font-mono font-bold ${isCritical ? 'text-red-500' : 'text-slate-600'}`}>{task.total_float_days}d</p>
                              </div>
                              
                              <div className="text-right mr-4 hidden sm:block">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Delay Prob</p>
                                <p className="font-mono font-bold text-amber-600">{(task.delay_probability * 100).toFixed(0)}%</p>
                              </div>

                              <button className="text-slate-400 hover:text-slate-600">
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </button>
                            </div>

                            {/* Expanded AI Recommendation Panel */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden bg-slate-50 border-t border-slate-200"
                                >
                                  <div className="p-6 text-slate-650">
                                    <div className="flex items-center gap-3 mb-4">
                                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                                        <Zap size={16} />
                                      </div>
                                      <h5 className="font-bold text-slate-800 text-lg">AI Mitigation Strategy</h5>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Equipment Context</span>
                                        <span className="text-sm text-slate-700">{task.equipment_description || "Standard civil/structural task"}</span>
                                      </div>
                                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Predecessors</span>
                                        <span className="text-sm font-mono text-indigo-600">
                                          {task.predecessor_ids_json && JSON.parse(task.predecessor_ids_json).length > 0 
                                            ? JSON.parse(task.predecessor_ids_json).join(", ") 
                                            : "None"}
                                        </span>
                                      </div>
                                      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-center">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Timeline Impact</span>
                                        <span className="text-sm text-slate-700 flex items-center gap-2"><Clock size={14} /> {task.planned_start} to {task.planned_finish}</span>
                                      </div>
                                    </div>

                                    {task.mitigation_text ? (
                                      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 shadow-inner">
                                        <p className="text-sm leading-relaxed text-indigo-900 whitespace-pre-wrap">{task.mitigation_text}</p>
                                        <div className="mt-4 flex items-center justify-end">
                                          <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors">
                                            Apply to Schedule
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 border-dashed">
                                        <AlertTriangle size={32} className="mx-auto text-amber-500/50 mb-3" />
                                        <p className="text-slate-500 font-medium">No AI mitigation has been generated for this task yet.</p>
                                        <p className="text-sm text-slate-450 mt-1">Click the <strong className="text-slate-700">Run AI Risk Analysis</strong> button to compute strategies.</p>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>

                  {delayData && delayData.tasks && delayData.tasks.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl overflow-hidden shadow-lg">
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                          <Clock size={18} className="text-amber-600" />
                          <h3 className="font-bold text-slate-700">Delay Prediction vs Historical Average</h3>
                        </div>
                        <div className="flex gap-6 mt-2 text-xs text-slate-500">
                          <span>Avg predicted: <strong className="text-amber-600">{delayData.avg_predicted_delay_days}d</strong></span>
                          <span>Avg historical: <strong className="text-slate-600">{delayData.avg_historical_delay_days}d</strong></span>
                          <span>Exceeding historical: <strong className="text-red-500">{delayData.tasks_exceeding_historical}</strong></span>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        {delayData.tasks.filter(t => t.predicted_delay_days > 0 || t.historical_avg_delay > 0).slice(0, 10).map((task) => {
                          const predicted = task.predicted_delay_days || 0;
                          const historical = task.historical_avg_delay || 0;
                          const maxVal = Math.max(predicted, historical, 1);
                          const isWorse = predicted > historical;
                          return (
                            <div key={task.id} className="px-6 py-3 flex items-center gap-4">
                              <div className="w-32 min-w-[8rem] truncate">
                                <span className="text-xs font-mono text-slate-500">{task.task_code}</span>
                                <p className="text-xs text-slate-700 truncate font-medium">{task.description?.slice(0, 30)}</p>
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400 w-20">Predicted</span>
                                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${(predicted / maxVal) * 100}%` }}
                                      transition={{ duration: 0.8 }}
                                      className={`h-full rounded-full ${isWorse ? 'bg-red-400' : 'bg-amber-400'}`}
                                    />
                                  </div>
                                  <span className={`text-xs font-bold w-8 text-right ${isWorse ? 'text-red-500' : 'text-amber-600'}`}>{predicted}d</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400 w-20">Historical</span>
                                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${(historical / maxVal) * 100}%` }}
                                      transition={{ duration: 0.8, delay: 0.1 }}
                                      className="h-full rounded-full bg-slate-400"
                                    />
                                  </div>
                                  <span className="text-xs font-bold w-8 text-right text-slate-500">{historical}d</span>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${task.verdict === 'On Track' ? 'bg-green-100 text-green-700' : task.verdict === 'At Risk' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                {task.verdict}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full min-h-[500px] flex items-center justify-center bg-white/30 backdrop-blur-sm border border-white/40 rounded-3xl border-dashed">
                  <div className="text-center opacity-50">
                    <Calendar size={64} className="mx-auto mb-4 text-slate-400" />
                    <p className="text-xl font-medium text-slate-600">No Schedule Data</p>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">Upload a schedule file on the left to begin enterprise AI analysis.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
