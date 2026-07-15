import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckSquare, Play, AlertTriangle, CheckCircle, Activity, 
  RefreshCw, FileText, ClipboardCheck, XCircle, Map as MapIcon,
  Search, Server, Settings, PlayCircle
} from "lucide-react";
import api from "../api/client.js";

function SidebarItem({ icon: Icon, label, active, onClick, status }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 text-[13px] rounded-md cursor-pointer transition-colors ${active ? 'bg-[#2A2C2A] text-white font-medium' : 'text-[#8A8D8A] hover:text-white hover:bg-[#2A2C2A]/50'}`}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <Icon size={14} className={active ? "text-indigo-400 shrink-0" : "text-[#8A8D8A] shrink-0"} />
        <span className="truncate">{label}</span>
      </div>
      {status && (
        <span className="text-[10px] font-bold text-emerald-400 shrink-0">{status}</span>
      )}
    </div>
  );
}

function SidebarSection({ title, children }) {
  return (
    <div className="mb-6">
      <div className="text-[10px] text-[#8A8D8A] uppercase tracking-widest font-bold mb-2 px-3">
        {title}
      </div>
      <div className="space-y-0.5 px-2">
        {children}
      </div>
    </div>
  );
}

export default function CommissioningPage() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [runningStep, setRunningStep] = useState(false);
  const [actualValue, setActualValue] = useState("");
  const [checkedBy, setCheckedBy] = useState("QA Engineer");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const [tasksData, recordsData] = await Promise.all([
        api.getCommissioningTasks(),
        api.getCommissioningRecords()
      ]);
      const fetchedTasks = tasksData.commissioning_tasks || [];
      setTasks(fetchedTasks);
      setStats(recordsData.summary || null);
      
      if (selectedTask) {
        const updatedTask = fetchedTasks.find(t => t.id === selectedTask.id);
        if (updatedTask) setSelectedTask(updatedTask);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateChecklist(taskId) {
    try {
      setGenerating(true);
      setError(null);
      await api.generateCommissioningChecklist(taskId);
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleRunStep(stepNumber) {
    if (!actualValue) {
      setError("Please provide an actual value to record.");
      return;
    }
    try {
      setRunningStep(stepNumber);
      setError(null);
      await api.runCommissioningStep(selectedTask.id, stepNumber, actualValue, checkedBy);
      setActualValue("");
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunningStep(false);
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'pass': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'fail': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-[#8A8D8A] bg-[#2A2C2A] border-[#2A2C2A]';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pass': return <CheckCircle size={14} />;
      case 'fail': return <XCircle size={14} />;
      default: return <Activity size={14} />;
    }
  };

  return (
    <div className="flex-1 w-full h-full relative bg-[#131413] overflow-hidden flex flex-col font-sans">
      
      {/* ─── Top Header (Like Supabase Top Nav) ─── */}
      <div className="flex-none h-12 border-b border-[#2A2C2A] bg-[#181A19] flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[#8A8D8A]">
            <MapIcon size={16} className="text-indigo-500" />
            <span className="text-white font-semibold">DC Project Org</span>
            <span className="text-[#2A2C2A]">/</span>
            <span className="text-white">Commissioning Copilot</span>
            <span className="text-[#2A2C2A]">/</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">PRODUCTION</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A8D8A]" />
            <input 
              type="text" 
              placeholder="Search sequences..." 
              className="bg-[#181A19] border border-[#2A2C2A] text-sm text-white rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#2A2C2A] w-48 transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-md border border-indigo-500/20">
            <Activity size={14} />
            <span>AI Connected</span>
          </div>
          <button 
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-[#2A2C2A] hover:bg-[#2A2C2A] text-white px-3 py-1.5 rounded-md text-sm font-semibold transition-colors border border-[#2A2C2A]"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Sidebar (Task Management) ─── */}
        <div className="w-[240px] flex-none bg-[#131413] border-r border-[#2A2C2A] overflow-y-auto z-10 flex flex-col py-4 custom-scrollbar">
          <div className="px-4 mb-6">
            <h2 className="text-base font-semibold text-white">Quality Assurance</h2>
          </div>

          <SidebarSection title="System Overviews">
            <SidebarItem icon={FileText} label="Master Dashboard" />
            <SidebarItem icon={ClipboardCheck} label="KPIs & Reporting" />
          </SidebarSection>

          <SidebarSection title="Schedule Tasks">
            {tasks.length === 0 && !loading && (
              <div className="text-[11px] text-[#8A8D8A] px-3 italic">
                No commissioning tasks found.
              </div>
            )}
            {tasks.map(task => (
              <SidebarItem 
                key={task.id}
                icon={Server}
                label={task.task_code}
                active={selectedTask?.id === task.id}
                onClick={() => setSelectedTask(task)}
                status={task.total_steps > 0 ? `${task.completion_pct}%` : 'Pending'}
              />
            ))}
          </SidebarSection>
        </div>

        {/* ─── Main Dotted Canvas Area ─── */}
        <div 
          className="flex-1 relative bg-[#131413] overflow-y-auto custom-scrollbar"
          style={{ 
            backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)', 
            backgroundSize: '24px 24px' 
          }}
        >
          {/* Global Error/Status Toast */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-3 rounded-lg border backdrop-blur-md font-medium text-xs shadow-xl bg-red-950/90 border-red-900 text-red-400 flex items-center justify-center gap-2"
                >
                  <AlertTriangle size={14} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!selectedTask ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
               <div className="w-24 h-24 rounded-2xl bg-[#181A19] border border-[#2A2C2A] flex items-center justify-center mb-6 shadow-2xl">
                 <CheckSquare size={40} className="text-[#8A8D8A]" />
               </div>
               <h2 className="text-xl font-bold text-white mb-2">Select a Task</h2>
               <p className="text-sm text-[#8A8D8A] max-w-sm text-center">
                 Choose a commissioning task from the sidebar to generate its AI-driven testing sequence or record execution results.
               </p>
             </div>
          ) : (
            <div className="p-8 max-w-4xl mx-auto z-10 relative">
              
              <div className="bg-[#181A19] border border-[#2A2C2A] rounded-xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-[#2A2C2A] bg-[#181A19]">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-bold text-white">{selectedTask.description}</h2>
                    <span className="px-2.5 py-1 bg-[#2A2C2A] text-[#8A8D8A] rounded text-xs font-bold font-mono border border-[#2A2C2A]">
                      {selectedTask.task_code}
                    </span>
                  </div>
                  <p className="text-sm text-[#8A8D8A] flex items-center gap-4">
                    <span>Equipment: {selectedTask.equipment_description || "Integrated System"}</span>
                    <span>•</span>
                    <span>Steps: {selectedTask.total_steps || "Not Generated"}</span>
                  </p>
                </div>

                {/* Content */}
                <div className="p-6">
                  {selectedTask.total_steps === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-900/30 flex items-center justify-center text-indigo-400 mb-6">
                        <Activity size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">Synthesize Test Sequence</h3>
                      <p className="text-[#8A8D8A] text-sm max-w-md mb-8">
                        The Copilot will analyze the equipment profile and generate a rigorous testing sequence based on Uptime Institute standards.
                      </p>
                      <button
                        onClick={() => handleGenerateChecklist(selectedTask.id)}
                        disabled={generating}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-md font-bold text-sm transition-colors flex items-center gap-2 shadow-lg"
                      >
                        {generating ? <RefreshCw size={14} className="animate-spin" /> : <PlayCircle size={14} />}
                        {generating ? "Synthesizing..." : "Generate Sequence"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#2A2C2A]">
                        <h3 className="text-xs font-bold text-[#8A8D8A] uppercase tracking-wider">Execution Pipeline</h3>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                          {selectedTask.completion_pct}% Complete
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        {selectedTask.commissioning_records.map((step, idx) => {
                          const isComplete = step.pass_fail === 'pass' || step.pass_fail === 'fail';
                          
                          return (
                            <div key={idx} className="flex gap-4">
                              {/* Step Number Column */}
                              <div className="flex flex-col items-center pt-2">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${isComplete ? (step.pass_fail === 'pass' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-red-500 bg-red-500/20 text-red-400') : 'border-[#2A2C2A] bg-[#2A2C2A] text-[#8A8D8A]'}`}>
                                  {getStatusIcon(step.pass_fail)}
                                </div>
                                {idx !== selectedTask.commissioning_records.length - 1 && (
                                  <div className="w-0.5 h-full bg-[#2A2C2A] my-2" />
                                )}
                              </div>
                              
                              {/* Card Content */}
                              <div className="flex-1 pb-6">
                                <div className={`p-4 rounded-lg border ${isComplete ? 'bg-[#181A19] border-[#2A2C2A]' : 'bg-[#181A19] border-[#2A2C2A]'}`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs font-bold text-indigo-400">Step {step.step_number}</div>
                                    <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusColor(step.pass_fail)}`}>
                                      {step.pass_fail || step.status}
                                    </div>
                                  </div>
                                  <div className="font-semibold text-white text-sm mb-1">{step.step_name}</div>
                                  <div className="text-xs text-[#8A8D8A] mb-4">Criteria: {step.acceptance_criteria}</div>
                                  
                                  {!isComplete && (
                                    <div className="space-y-3 mt-4 pt-4 border-t border-[#2A2C2A]">
                                      <input 
                                        type="text" 
                                        placeholder="Enter actual observed value..."
                                        value={runningStep === step.step_number ? actualValue : ""}
                                        onChange={(e) => {
                                          if(runningStep !== step.step_number) setRunningStep(step.step_number);
                                          setActualValue(e.target.value);
                                        }}
                                        className="w-full bg-[#131413] border border-[#2A2C2A] rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                                      />
                                      <div className="flex gap-2">
                                        <input 
                                          type="text" 
                                          placeholder="QA Engineer"
                                          value={checkedBy}
                                          onChange={(e) => setCheckedBy(e.target.value)}
                                          className="w-1/3 bg-[#131413] border border-[#2A2C2A] rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                                        />
                                        <button 
                                          onClick={() => handleRunStep(step.step_number)}
                                          disabled={runningStep === step.step_number && !actualValue}
                                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                                        >
                                          {generating ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                                          Execute Validation
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {isComplete && step.actual_value && (
                                    <div className="mt-3 p-3 bg-[#131413] rounded-md border border-[#2A2C2A]">
                                      <div className="flex justify-between items-center">
                                        <div className="text-xs font-semibold text-[#8A8D8A]">Recorded Value</div>
                                        <div className="text-[10px] text-[#8A8D8A]">
                                          By {step.checked_by} at {step.checked_ts ? new Date(step.checked_ts).toLocaleTimeString() : 'N/A'}
                                        </div>
                                      </div>
                                      <div className="text-sm font-medium text-[#EDEFEE] mt-1">{step.actual_value}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
