import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, Shield, FileText, Clock, Zap,
  ChevronDown, ExternalLink, RefreshCw,
  Database, Server, GitBranch, Archive, BarChart2, CheckCircle2,
  XCircle, AlertCircle, Play, TrendingUp
} from "lucide-react";
import api from "../api/client.js";
import { useWorkspace } from "../context/WorkspaceContext.jsx";

// ─── Mini bar chart for activity ─────────────────────────────────────────────
function MiniBarChart({ data = [], colorGood = "#10B981", colorBad = "#EF4444" }) {
  const max = Math.max(...data.map((d) => d.total || 1), 1);
  return (
    <div className="flex items-end gap-0.5 h-12 w-full mt-2 bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
          {d.errors > 0 && (
            <div
              className="w-full rounded-sm opacity-80"
              style={{ height: `${(d.errors / max) * 24}px`, backgroundColor: colorBad, minHeight: "2px" }}
            />
          )}
          {d.good > 0 && (
            <div
              className="w-full rounded-sm opacity-90"
              style={{ height: `${(d.good / max) * 24}px`, backgroundColor: colorGood, minHeight: "2px" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const isActive = status === "active";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
      isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-255/60" : "bg-slate-100 text-slate-500 border border-slate-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
      {isActive ? "Active" : "Paused"}
    </span>
  );
}

// ─── Info card (top grid) ──────────────────────────────────────────────────
function InfoCard({ label, value, icon: Icon, iconColor = "text-slate-400", valueColor = "text-slate-900", sub }) {
  return (
    <div className="flex items-start gap-3 py-4 px-5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className={`mt-0.5 ${iconColor}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</div>
        <div className={`text-sm font-bold truncate ${valueColor}`}>{value}</div>
        {sub && <div className="text-[10px] text-slate-500 mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Service chart card ───────────────────────────────────────────────────────
function ServiceCard({ label, total, warnings, errors, chartData }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex-1 min-w-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="ml-auto flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-amber-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            WARNINGS {warnings}
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            ERRORS {errors}
          </span>
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{total}</div>
      <MiniBarChart data={chartData} />
    </div>
  );
}

// ─── Advisor issue card ───────────────────────────────────────────────────────
function IssueCard({ severity, category, title, description }) {
  const sevColors = {
    CRITICAL: "text-red-700 border-red-200 bg-red-50/30",
    MAJOR: "text-amber-700 border-amber-255 bg-amber-50/30",
    MINOR: "text-blue-750 border-blue-200 bg-blue-50/30",
  };
  const pillColor = {
    CRITICAL: "bg-red-100 text-red-700 border-red-200",
    MAJOR: "bg-amber-100 text-amber-800 border-amber-250",
    MINOR: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <div className={`border rounded-xl p-4 ${sevColors[severity] || sevColors.MINOR} shadow-[0_1px_2px_rgba(0,0,0,0.02)]`}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={14} className="opacity-80" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{category}</span>
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${pillColor[severity] || pillColor.MINOR}`}>
          {severity}
        </span>
      </div>
      <div className="font-bold text-sm text-slate-900 mb-1">{title}</div>
      <div className="text-[11px] text-slate-500 leading-relaxed">{description}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { currentProject } = useWorkspace();

  useEffect(() => { fetchSummary(); }, []);

  async function fetchSummary() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchSummary();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading dashboard…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md text-center shadow-sm">
          <XCircle size={32} className="text-red-650 mx-auto mb-4" />
          <div className="text-red-900 font-bold mb-2">Failed to load dashboard</div>
          <div className="text-red-650 text-sm mb-6">{error}</div>
          <button onClick={fetchSummary} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const ncr = summary?.open_ncr_count || {};
  const health = summary?.project_health_score || 0;
  const totalNcrs = (ncr.CRITICAL || 0) + (ncr.MAJOR || 0) + (ncr.MINOR || 0);
  const recentRuns = summary?.recent_agent_runs || [];
  const lastRun = recentRuns[0];

  // Build activity indicators
  const agentStats = {
    compliance: { total: summary?.compliance_checks_run || 0, warnings: ncr.MAJOR || 0, errors: ncr.CRITICAL || 0 },
    rfi: { total: summary?.open_rfis || 0, warnings: 0, errors: 0 },
    schedule: { total: summary?.at_risk_tasks || 0, warnings: summary?.at_risk_tasks || 0, errors: 0 },
    commissioning: { total: Math.round((summary?.commissioning_pass_rate_pct || 0) * 0.1), warnings: 0, errors: 0 },
  };

  const makeChars = (total, errors, n = 12) => {
    return Array.from({ length: n }, (_, i) => {
      const base = Math.max(0, Math.round((total / n) * (0.5 + Math.random())));
      const err = i % 3 === 0 && errors > 0 ? Math.max(1, Math.round(errors / 4)) : 0;
      return { total: base + err, good: base, errors: err };
    });
  };

  // Build advisor issues from NCRs & deviations
  const advisorIssues = [];
  if (ncr.CRITICAL > 0) advisorIssues.push({ severity: "CRITICAL", category: "Compliance", title: `${ncr.CRITICAL} Critical NCR(s) Open`, description: `There ${ncr.CRITICAL === 1 ? "is" : "are"} ${ncr.CRITICAL} critical non-conformance report${ncr.CRITICAL === 1 ? "" : "s"} that require immediate attention.` });
  if (ncr.MAJOR > 0) advisorIssues.push({ severity: "MAJOR", category: "Compliance", title: `${ncr.MAJOR} Major NCR(s) Pending`, description: `${ncr.MAJOR} major deviation${ncr.MAJOR === 1 ? "" : "s"} detected against spec. Review and assign resolution owners.` });
  if (summary?.at_risk_tasks > 0) advisorIssues.push({ severity: "MAJOR", category: "Schedule Risk", title: `${summary.at_risk_tasks} Tasks at Risk of Delay`, description: "AI schedule risk analysis flagged tasks with high delay probability. Review critical path." });
  if (summary?.open_rfis > 0) advisorIssues.push({ severity: "MINOR", category: "RFI", title: `${summary.open_rfis} Open RFI(s) Unresolved`, description: "Outstanding Request for Information items need engineering response." });
  if (ncr.MINOR > 0) advisorIssues.push({ severity: "MINOR", category: "Compliance", title: `${ncr.MINOR} Minor NCR(s)`, description: "Minor deviations noted. Review and close with corrective action." });

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-700 -m-4 sm:-m-6 lg:-m-8 px-6 py-6 lg:px-10">

      {/* ── Top: Project Header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {currentProject?.name || "Select a Project"}
              </h1>
              <StatusPill status={currentProject?.status || "paused"} />
            </div>
            {currentProject && (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <span className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-500 shadow-sm">
                  dcpi.ai/projects/{currentProject.id?.slice(0, 8)}
                </span>
                <button className="p-1 hover:text-slate-800 transition-colors">
                  <ExternalLink size={12} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold transition-colors shadow-sm"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => navigate("/compliance")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/10 transition-colors"
            >
              <Play size={14} />
              Run Agent
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Info Cards Grid + Right Panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 mb-8"
      >
        {/* Left: 3x3 info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <InfoCard
            label="Status"
            value={health >= 70 ? "Healthy" : health >= 40 ? "Degraded" : "At Risk"}
            icon={CheckCircle2}
            iconColor={health >= 70 ? "text-emerald-500" : health >= 40 ? "text-amber-500" : "text-red-500"}
            valueColor={health >= 70 ? "text-emerald-650" : health >= 40 ? "text-amber-600" : "text-red-655"}
            sub={`Health score: ${health.toFixed(0)}%`}
          />
          <InfoCard
            label="Compliance"
            value={`${summary?.compliance_checks_run || 0} checks`}
            icon={Shield}
            iconColor="text-blue-500"
            sub={`Accuracy: ${summary?.compliance_accuracy_pct?.toFixed(1) || 0}%`}
          />
          <InfoCard
            label="Open RFIs"
            value={summary?.open_rfis || 0}
            icon={FileText}
            iconColor="text-violet-500"
            sub="Awaiting engineering response"
          />
          <InfoCard
            label="Critical NCRs"
            value={ncr.CRITICAL || 0}
            icon={AlertCircle}
            iconColor="text-red-500"
            valueColor={ncr.CRITICAL > 0 ? "text-red-655" : "text-slate-900"}
            sub={`${totalNcrs} total open NCRs`}
          />
          <InfoCard
            label="Schedule Risk"
            value={`${summary?.at_risk_tasks || 0} tasks`}
            icon={BarChart2}
            iconColor="text-amber-500"
            valueColor={summary?.at_risk_tasks > 0 ? "text-amber-600" : "text-slate-950"}
            sub={`${summary?.critical_path_tasks || 0} on critical path`}
          />
          <InfoCard
            label="Last Agent Run"
            value={lastRun ? lastRun.agent_name.replace("_", " ") : "No runs yet"}
            icon={Clock}
            iconColor="text-slate-400"
            sub={lastRun ? lastRun.started_ts?.slice(0, 16).replace("T", " ") : "Upload docs to start"}
          />
          <InfoCard
            label="Documents"
            value={summary?.total_documents || 0}
            icon={Archive}
            iconColor="text-cyan-500"
            sub="Specification & submittal files"
          />
          <InfoCard
            label="Capacity"
            value={currentProject?.size_mw ? `${currentProject.size_mw} MW` : "—"}
            icon={Server}
            iconColor="text-indigo-500"
            sub={currentProject?.location || "No location set"}
          />
          <InfoCard
            label="Target Deadline"
            value={currentProject?.deadline || "—"}
            icon={GitBranch}
            iconColor="text-pink-500"
            sub={currentProject?.budget ? `Budget: $${(currentProject.budget / 1e6).toFixed(1)}M` : "No budget set"}
          />
        </div>

        {/* Right: AI Health Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Activity size={12} className="text-emerald-650" />
            </div>
            <span className="text-sm font-bold text-slate-800">AI Health Score</span>
            <span className="text-[10px] font-semibold text-slate-400 ml-1">
              {currentProject?.location || "Global"}
            </span>
            {currentProject?.location && (
              <span className="ml-auto text-sm">🌏</span>
            )}
          </div>

          {/* Radial health */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="26" fill="none"
                  stroke={health >= 70 ? "#10B981" : health >= 40 ? "#F59E0B" : "#EF4444"}
                  strokeWidth="6"
                  strokeDasharray={`${(health / 100) * 163} 163`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-slate-800">
                {health.toFixed(0)}%
              </div>
            </div>
            <div className="text-sm font-bold text-slate-900">
              {health >= 70 ? "Project Healthy" : health >= 40 ? "Needs Attention" : "Critical Issues"}
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: "Compliance", value: summary?.compliance_accuracy_pct || 0, max: 100, color: "#3B82F6", unit: "%" },
              { label: "Docs processed", value: Math.min((summary?.total_documents || 0) * 10, 100), max: 100, color: "#8B5CF6", unit: "" },
              { label: "Tasks healthy", value: Math.max(0, 100 - ((summary?.at_risk_tasks || 0) * 10)), max: 100, color: "#10B981", unit: "%" },
              { label: "RFI backlog", value: Math.min((summary?.open_rfis || 0) * 5, 100), max: 100, color: "#F59E0B", unit: "" },
            ].map(({ label, value, color, unit }) => (
              <div key={label}>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-slate-450 font-semibold">{label}</span>
                  <span className="font-bold text-slate-700">{Math.round(value)}{unit}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.max(2, value)}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-slate-900">{summary?.total_ncrs_raised || 0}</div>
              <div className="text-[10px] text-slate-400 font-semibold">NCRs raised</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{summary?.open_rfis || 0}</div>
              <div className="text-[10px] text-slate-400 font-semibold">Open RFIs</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Activity Charts Section ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp size={16} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-800">
              {(summary?.compliance_checks_run || 0) + (summary?.open_rfis || 0) + (summary?.at_risk_tasks || 0)} Total Agent Actions
            </span>
            <span className="text-slate-300 text-sm">·</span>
            <span className="text-sm text-slate-500">
              {(summary?.compliance_accuracy_pct || 0).toFixed(1)}% Success Rate
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 bg-white flex items-center gap-1 shadow-sm">
              Last 60 minutes <ChevronDown size={12} />
            </span>
          </div>
        </div>

        {/* Service cards */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          <ServiceCard
            label="Compliance Agent"
            total={agentStats.compliance.total}
            warnings={agentStats.compliance.warnings}
            errors={agentStats.compliance.errors}
            chartData={makeChars(agentStats.compliance.total, agentStats.compliance.errors)}
          />
          <ServiceCard
            label="RFI Intelligence"
            total={agentStats.rfi.total}
            warnings={0}
            errors={0}
            chartData={makeChars(agentStats.rfi.total, 0)}
          />
          <ServiceCard
            label="Schedule Risk"
            total={agentStats.schedule.total}
            warnings={agentStats.schedule.warnings}
            errors={0}
            chartData={makeChars(agentStats.schedule.total, 0)}
          />
          <ServiceCard
            label="Commissioning"
            total={agentStats.commissioning.total}
            warnings={0}
            errors={0}
            chartData={makeChars(agentStats.commissioning.total, 0)}
          />
        </div>
      </motion.div>

      {/* ── Advisor Issues ── */}
      {advisorIssues.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <span className="text-slate-400">::</span>
              Advisor found {advisorIssues.length} issue{advisorIssues.length !== 1 ? "s" : ""}
            </div>
            <button
              onClick={() => navigate("/compliance")}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-emerald-600 hover:text-emerald-700 transition-colors shadow-sm"
            >
              <Zap size={12} />
              Ask Assistant
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {advisorIssues.slice(0, 4).map((issue, i) => (
              <IssueCard key={i} {...issue} />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Recent Agent Runs ── */}
      {recentRuns.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <span className="text-slate-400">::</span>
              Recent AI Activity
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest font-bold bg-slate-50/50">
                  <th className="text-left px-5 py-3">Agent</th>
                  <th className="text-left px-5 py-3 hidden sm:table-cell">Summary</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Records</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3 hidden lg:table-cell">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRuns.slice(0, 6).map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-800 capitalize whitespace-nowrap">
                      {run.agent_name.replace(/_/g, " ")}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs truncate max-w-xs hidden sm:table-cell">
                      {run.output_summary || "Completed"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs hidden md:table-cell">
                      {run.records_processed ?? "—"} / {run.records_created ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        run.status === "completed"
                          ? "text-emerald-755 bg-emerald-50 border-emerald-200/60"
                          : run.status === "failed"
                          ? "text-red-755 bg-red-50 border-red-200/60"
                          : "text-amber-755 bg-amber-50 border-amber-200/60"
                      }`}>
                        {run.status === "completed" ? <CheckCircle2 size={10} /> : run.status === "failed" ? <XCircle size={10} /> : <RefreshCw size={10} />}
                        {run.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap hidden lg:table-cell">
                      {run.started_ts?.slice(0, 16).replace("T", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ── Empty state when no data ── */}
      {!summary?.compliance_checks_run && !summary?.open_rfis && recentRuns.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-8 border border-dashed border-slate-200 rounded-2xl p-12 text-center bg-white"
        >
          <Database size={32} className="text-slate-400 mx-auto mb-4" />
          <div className="text-slate-800 font-bold mb-2">No activity yet</div>
          <div className="text-slate-500 text-sm mb-6">Upload specification documents and run compliance checks to see data here.</div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => navigate("/documents")} className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors shadow-sm">
              <FileText size={14} />
              Upload Documents
            </button>
            <button onClick={() => navigate("/compliance")} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/10 transition-colors">
              <Shield size={14} />
              Run Compliance
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
