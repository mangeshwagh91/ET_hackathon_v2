import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight,
  Play, RefreshCw, AlertTriangle, Shield, Zap, BarChart2, FileText, Award
} from "lucide-react";
import api from "../api/client.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

const STEP_TYPE_COLORS = {
  SAFETY: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", icon: <Shield size={14} /> },
  INSPECTION: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", icon: <FileText size={14} /> },
  ELECTRICAL: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", icon: <Zap size={14} /> },
  FUNCTIONAL: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", icon: <Play size={14} /> },
  PERFORMANCE: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", icon: <BarChart2 size={14} /> },
  VERIFICATION: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20", icon: <CheckCircle size={14} /> },
  SIGN_OFF: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", icon: <Award size={14} /> },
  MECHANICAL: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", icon: <Wrench size={14} /> },
  PREPARATION: { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/20", icon: <RefreshCw size={14} /> },
};

const PASS_FAIL_OPTIONS = ["pass", "fail"];
const COMMON_VALUES = {
  SAFETY: ["Confirmed", "Verified", "Compliant", "Not Compliant"],
  INSPECTION: ["pass", "fail", "Minor Issues Found", "Major Issues Found"],
  ELECTRICAL: ["pass", "fail"],
  FUNCTIONAL: ["pass", "fail"],
  PERFORMANCE: ["pass", "fail"],
  VERIFICATION: ["pass", "fail", "Partial"],
  SIGN_OFF: ["pass", "fail"],
  DEFAULT: ["pass", "fail", "N/A"],
};

export default function CommissioningCopilot() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [stepValues, setStepValues] = useState({});
  const [runningStep, setRunningStep] = useState(null);
  const [generatingChecklist, setGeneratingChecklist] = useState(null);
  const [activeTab, setActiveTab] = useState("tasks"); // tasks | records

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getCommissioningTasks();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateChecklist(taskId) {
    setGeneratingChecklist(taskId);
    try {
      await api.generateCommissioningChecklist(taskId);
      await fetchData();
      setExpandedTask(taskId);
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setGeneratingChecklist(null);
    }
  }

  async function handleRunStep(taskId, stepNumber) {
    const value = stepValues[`${taskId}-${stepNumber}`];
    if (!value) return;
    const key = `${taskId}-${stepNumber}`;
    setRunningStep(key);
    try {
      await api.runCommissioningStep(taskId, stepNumber, value);
      await fetchData();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setRunningStep(null);
    }
  }

  if (loading) return <LoadingSpinner message="Loading Commissioning Copilot..." />;

  if (error) return (
    <div className="max-w-5xl mx-auto px-4 pt-24">
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">
        <strong>Error:</strong> {error}
        <button onClick={fetchData} className="ml-4 text-sm underline">Retry</button>
      </div>
    </div>
  );

  const tasks = data?.commissioning_tasks || [];
  const summaryStats = [
    { label: "Total Tasks", value: data?.total || 0, color: "text-blue-600" },
    { label: "Fully Complete", value: data?.fully_complete || 0, color: "text-emerald-600" },
    { label: "In Progress", value: data?.in_progress || 0, color: "text-amber-600" },
    { label: "Not Started", value: data?.not_started || 0, color: "text-slate-500" },
    { label: "Pass Rate", value: `${data?.pass_rate_pct || 0}%`, color: "text-cyan-600" },
  ];

  return (
    <div className="min-h-screen bg-transparent pt-6 pb-16 text-slate-800">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between flex-wrap gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-md">
                <Wrench size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Commissioning Copilot</h1>
                <p className="text-slate-500 text-sm">AI-guided test sequences · auto acceptance checks · test record generation</p>
              </div>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </motion.div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6"
        >
          {summaryStats.map((stat, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-slate-400 text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 border-b border-slate-200">
          {[
            { id: "tasks", label: "Commissioning Tasks" },
            { id: "records", label: "Test Records" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors -mb-px border-t border-x ${
                activeTab === tab.id
                  ? "bg-white text-emerald-600 border-slate-200 border-b-transparent shadow-sm"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {activeTab === "tasks" && (
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Wrench size={40} className="mx-auto mb-4 opacity-30" />
                <p>No commissioning tasks found in schedule.</p>
                <p className="text-sm mt-2">Tasks with keywords like "commission", "test", "startup" will appear here.</p>
              </div>
            ) : (
              tasks.map((task, idx) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  idx={idx}
                  expanded={expandedTask === task.id}
                  onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                  onGenerateChecklist={handleGenerateChecklist}
                  onRunStep={handleRunStep}
                  generatingChecklist={generatingChecklist}
                  runningStep={runningStep}
                  stepValues={stepValues}
                  setStepValues={setStepValues}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "records" && (
          <RecordsPanel />
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, idx, expanded, onToggle, onGenerateChecklist, onRunStep, generatingChecklist, runningStep, stepValues, setStepValues }) {
  const records = task.commissioning_records || [];
  const totalSteps = records.length;
  const passed = records.filter(r => r.pass_fail === "pass").length;
  const failed = records.filter(r => r.pass_fail === "fail").length;
  const pending = records.filter(r => r.pass_fail === "pending" || !r.pass_fail || r.pass_fail === null).length;
  const pct = totalSteps > 0 ? Math.round(passed / totalSteps * 100) : 0;

  const riskColor = task.risk_level === "critical" ? "text-red-400 border-red-500/30"
    : task.risk_level === "high" ? "text-orange-400 border-orange-500/30"
    : task.risk_level === "medium" ? "text-yellow-400 border-yellow-500/30"
    : "text-emerald-400 border-emerald-500/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
    >
      {/* Task Header */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors text-left"
      >
        {/* Completion ring */}
        <div className="relative w-12 h-12 flex-shrink-0 mt-0.5">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15" fill="none"
              stroke={failed > 0 ? "#ef4444" : pct === 100 ? "#10b981" : "#f59e0b"}
              strokeWidth="3"
              strokeDasharray={`${pct * 94.2 / 100} 94.2`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800">
            {pct}%
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-455">{task.task_code}</span>
            {task.is_critical_path ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Critical Path</span>
            ) : null}
            {task.risk_level && task.risk_level !== "negligible" && (
              <span className={`text-xs px-2 py-0.5 rounded-full border ${riskColor} bg-current/5`}>{task.risk_level} risk</span>
            )}
          </div>
          <p className="text-slate-900 font-bold mt-1 text-sm truncate">{task.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span>📅 {task.planned_start?.slice(0, 10)} → {task.planned_finish?.slice(0, 10)}</span>
            {task.equipment_class && <span>🔧 {task.equipment_class}</span>}
            {totalSteps > 0 && (
              <span>
                <span className="text-emerald-600">{passed} pass</span>
                {failed > 0 && <span className="text-red-500 ml-2">{failed} fail</span>}
                {pending > 0 && <span className="text-slate-400 ml-2">{pending} pending</span>}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalSteps === 0 ? (
            <span className="text-xs text-slate-400 italic">No checklist</span>
          ) : (
            <ChevronDown size={18} className={`text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
          )}
        </div>
      </button>

      {/* Task Checklist Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200 bg-slate-50"
          >
            <div className="p-5 space-y-4">
              {totalSteps === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500">No commissioning checklists compiled by agents for this equipment type.</p>
                  <button
                    onClick={() => onGenerateChecklist(task.id, task.equipment_class)}
                    disabled={generatingChecklist === task.id}
                    className="mt-3 text-xs bg-indigo-600 hover:bg-indigo-750 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 mx-auto disabled:opacity-50"
                  >
                    {generatingChecklist === task.id ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                    Compile AI Test Checklist
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Test Checklist</h4>
                    <span className="text-xs text-slate-400">{passed}/{totalSteps} checks passed</span>
                  </div>

                  {records.map((step) => {
                    const stepKey = `${task.id}-${step.step_number}`;
                    const typeStyle = STEP_TYPE_COLORS[step.step_type] || STEP_TYPE_COLORS.FUNCTIONAL;
                    const isRunning = runningStep === stepKey;
                    const isPassed = step.pass_fail === "pass";
                    const isFailed = step.pass_fail === "fail";
                    const isPending = !isPassed && !isFailed;

                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: step.step_number * 0.03 }}
                        className={`relative flex gap-3 p-4 rounded-xl border transition-all ${
                          isPassed ? "bg-emerald-500/5 border-emerald-500/20"
                          : isFailed ? "bg-red-500/5 border-red-500/20"
                          : "bg-white border-slate-200 shadow-sm"
                        }`}
                      >
                        {/* Step number + status icon */}
                        <div className="flex-shrink-0 flex flex-col items-center gap-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isPassed ? "bg-emerald-100 text-emerald-700"
                            : isFailed ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-500"
                          }`}>
                            {isPassed ? <CheckCircle size={16} />
                             : isFailed ? <XCircle size={16} />
                             : step.step_number}
                          </div>
                          {step.step_number < records.length && (
                            <div className="w-px h-4 bg-slate-200" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                                  {typeStyle.icon}
                                  {step.step_type}
                                </span>
                              </div>
                              <p className="text-slate-850 text-sm font-semibold">{step.step_name}</p>
                              <p className="text-slate-500 text-xs mt-1">{step.acceptance_criteria}</p>
                              {step.actual_value && (
                                <p className="text-xs mt-1">
                                  <span className="text-slate-400">Actual: </span>
                                  <span className={isPassed ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>{step.actual_value}</span>
                                </p>
                              )}
                              {step.flagged_ncr_id && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-red-500 font-bold">
                                  <AlertTriangle size={12} />
                                  NCR raised: {step.flagged_ncr_id.slice(0, 8)}
                                </div>
                              )}
                            </div>

                            {/* Input for pending steps */}
                            {isPending && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <select
                                  value={stepValues[stepKey] || ""}
                                  onChange={(e) => setStepValues(prev => ({ ...prev, [stepKey]: e.target.value }))}
                                  className="text-xs bg-slate-50 border border-slate-250 text-slate-800 rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500"
                                >
                                  <option value="">Select result...</option>
                                  {(COMMON_VALUES[step.step_type] || COMMON_VALUES.DEFAULT).map(v => (
                                    <option key={v} value={v}>{v}</option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  placeholder="or type value..."
                                  value={stepValues[stepKey] || ""}
                                  onChange={(e) => setStepValues(prev => ({ ...prev, [stepKey]: e.target.value }))}
                                  className="text-xs bg-slate-50 border border-slate-250 text-slate-800 rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500 w-28"
                                />
                                <button
                                  onClick={() => onRunStep(task.id, step.step_number)}
                                  disabled={!stepValues[stepKey] || isRunning}
                                  className="text-xs px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-40 flex items-center gap-1 shadow-sm"
                                >
                                  {isRunning ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                                  Record
                                </button>
                              </div>
                            )}
                          </div>

                          {step.checked_ts && (
                            <p className="text-xs text-slate-500 mt-1.5">
                              <Clock size={10} className="inline mr-1" />
                              {step.checked_by} · {step.checked_ts?.slice(0, 19).replace("T", " ")}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  useEffect(() => {
    api.getCommissioningRecords()
      .then(setRecords)
      .catch(() => setRecords(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading records..." />;

  if (!records?.records?.length) {
    return (
      <div className="text-center py-16 text-slate-500">
        <FileText size={40} className="mx-auto mb-4 opacity-30" />
        <p>No test records yet. Run commissioning steps to generate records.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Steps", value: records.total, color: "text-blue-600" },
          { label: "Passed", value: records.passed, color: "text-emerald-600" },
          { label: "Failed", value: records.failed, color: "text-red-500" },
          { label: "Pass Rate", value: `${records.pass_rate_pct}%`, color: "text-cyan-600" },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-450 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase font-bold">
            <tr>
              <th className="px-4 py-3 text-left">Task</th>
              <th className="px-4 py-3 text-left">Step</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Criteria</th>
              <th className="px-4 py-3 text-left">Actual</th>
              <th className="px-4 py-3 text-center">Result</th>
              <th className="px-4 py-3 text-left">Checked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.records.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-800 text-xs">{r.task_description?.slice(0, 40)}</td>
                <td className="px-4 py-3 text-slate-650 text-xs">{r.step_number}. {r.step_name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STEP_TYPE_COLORS[r.step_type]?.bg || "bg-slate-100"} ${STEP_TYPE_COLORS[r.step_type]?.text || "text-slate-600"}`}>
                    {r.step_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{r.acceptance_criteria}</td>
                <td className="px-4 py-3 text-slate-800 text-xs">{r.actual_value || "—"}</td>
                <td className="px-4 py-3 text-center">
                  {r.pass_fail === "pass" ? (
                    <CheckCircle size={16} className="text-emerald-500 mx-auto" />
                  ) : r.pass_fail === "fail" ? (
                    <XCircle size={16} className="text-red-500 mx-auto" />
                  ) : (
                    <Clock size={16} className="text-slate-400 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{r.checked_ts?.slice(0, 10) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
