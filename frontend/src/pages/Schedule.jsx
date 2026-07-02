import { useState, useEffect, useRef } from "react";
import api from "../api/client.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import SeverityBadge from "../components/SeverityBadge.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function Schedule() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const csvInputRef = useRef();

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getScheduleTasks();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    try {
      setAnalyzing(true);
      setError(null);
      setStatusMsg(
        "Schedule Risk Agent running — computing risk scores and generating mitigations...",
      );
      await api.analyzeSchedule();
      setStatusMsg("✓ Analysis complete — reloading tasks");
      await loadTasks();
      setStatusMsg("");
    } catch (err) {
      setError(err.message);
      setStatusMsg("");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      setImporting(true);
      setError(null);
      setStatusMsg("Importing schedule CSV...");
      await api.importSchedule(formData);
      setStatusMsg("✓ Schedule imported");
      await loadTasks();
      setStatusMsg("");
    } catch (err) {
      setError(err.message);
      setStatusMsg("");
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  }

  function riskLevel(score) {
    if (score >= 0.75) return "HIGH";
    if (score >= 0.5) return "MEDIUM";
    if (score > 0) return "LOW";
    return null;
  }

  function rowClass(task) {
    if (task.total_float_days === 0)
      return "bg-red-50 border-l-4 border-red-500";
    if (task.risk_score >= 0.75) return "bg-orange-50";
    return "";
  }

  if (loading) return <LoadingSpinner message="Loading schedule tasks..." />;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">
          Schedule Risk Analysis
        </h1>
        <div className="flex items-center gap-3">
          <label
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm
            font-medium px-4 py-2 rounded-lg cursor-pointer transition-colors"
          >
            {importing ? "Importing..." : "📂 Import Schedule CSV"}
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || tasks.length === 0}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300
              disabled:cursor-not-allowed text-white font-semibold px-5 py-2
              rounded-lg text-sm transition-colors"
          >
            {analyzing ? "Analyzing..." : "⚡ Analyze Risks"}
          </button>
        </div>
      </div>

      {/* Status / error */}
      {(statusMsg || error) && (
        <div
          className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between ${
            error
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-teal-50 text-teal-700 border border-teal-200"
          }`}
        >
          <span>{error || statusMsg}</span>
          {error && (
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {analyzing && (
        <LoadingSpinner message="Schedule Risk Agent computing delay probabilities and generating LLM mitigations..." />
      )}

      {/* Tasks table */}
      {!analyzing && tasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <EmptyState
            title="No schedule tasks"
            description="Import a schedule CSV file to begin risk analysis"
          />
        </div>
      ) : (
        !analyzing && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    Code
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    Description
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">
                    Float
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">
                    Risk Score
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">
                    Delay Prob
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">
                    Level
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    Dates
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const isExpanded = expandedId === task.id;
                  const level = riskLevel(task.risk_score);
                  return [
                    <tr
                      key={task.id}
                      onClick={() => setExpandedId(isExpanded ? null : task.id)}
                      className={`cursor-pointer transition-colors hover:brightness-95 ${rowClass(task)}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 font-bold">
                        {task.task_code}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs">
                        <div className="truncate">{task.description}</div>
                      </td>
                      <td
                        className={`px-4 py-3 text-center font-bold ${
                          task.total_float_days === 0
                            ? "text-red-600"
                            : task.total_float_days <= 3
                              ? "text-amber-600"
                              : "text-slate-500"
                        }`}
                      >
                        {task.total_float_days}d
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                task.risk_score >= 0.75
                                  ? "bg-red-500"
                                  : task.risk_score >= 0.5
                                    ? "bg-orange-400"
                                    : "bg-green-400"
                              }`}
                              style={{
                                width: `${Math.round((task.risk_score || 0) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-600">
                            {Math.round((task.risk_score || 0) * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 text-xs">
                        {task.delay_probability > 0
                          ? `${Math.round(task.delay_probability * 100)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {level && <SeverityBadge severity={level} />}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        <div>{task.planned_start}</div>
                        <div>{task.planned_finish}</div>
                      </td>
                    </tr>,

                    isExpanded && (
                      <tr key={`${task.id}-expanded`} className="bg-slate-800">
                        <td colSpan={7} className="px-6 py-5">
                          <div className="text-white">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <span className="font-semibold text-teal-400 text-base">
                                {task.task_code} — Risk Mitigation Plan
                              </span>
                              {level && <SeverityBadge severity={level} />}
                              <span className="text-slate-400 text-xs">
                                Risk: {Math.round((task.risk_score || 0) * 100)}
                                % · Float: {task.total_float_days}d · Delay
                                prob:{" "}
                                {Math.round(
                                  (task.delay_probability || 0) * 100,
                                )}
                                %
                              </span>
                            </div>

                            {task.equipment_description && (
                              <p className="text-slate-400 text-xs mb-2">
                                Equipment: {task.equipment_description}
                              </p>
                            )}

                            {task.mitigation_text ? (
                              <div className="whitespace-pre-wrap text-slate-200 text-sm leading-relaxed">
                                {task.mitigation_text}
                              </div>
                            ) : (
                              <p className="text-slate-400 italic text-sm">
                                No mitigation generated yet. Click ⚡ Analyze
                                Risks to generate AI-powered mitigation options
                                for this task.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
