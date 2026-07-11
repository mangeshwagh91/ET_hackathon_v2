import { useRef, useEffect, useState } from "react";
import { motion, animate } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight, Zap, Play, Pause, ShieldCheck, 
  Clock, HelpCircle, FileText, Cpu, ChevronDown, Check
} from "lucide-react";

// ─── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, suffix = "", delay = 0, duration = 1.8 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const controls = animate(0, to, {
        duration,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (v) => setVal(Math.round(v)),
      });
      return () => controls.stop();
    }, delay * 1050);
    return () => clearTimeout(t);
  }, [to, delay, duration]);
  return <>{val}{suffix}</>;
}

// ─── The neural-network SVG behind the panels ─────────────────────────────────
function NetworkSVG() {
  const nodes = [
    { cx: "20%",  cy: "28%" }, { cx: "50%",  cy: "12%" }, { cx: "80%",  cy: "30%" },
    { cx: "85%",  cy: "68%" }, { cx: "55%",  cy: "82%" }, { cx: "18%",  cy: "72%" },
    { cx: "50%",  cy: "50%" },
  ];
  const edges = [[0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]];

  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50%" cy="50%" rx="45%" ry="40%" fill="url(#glow)" />
      {edges.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={nodes[a].cx} y1={nodes[a].cy}
          x2={nodes[b].cx} y2={nodes[b].cy}
          stroke="#14B8A6"
          strokeWidth="0.8"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.05, 0.25, 0.05] }}
          transition={{ duration: 4 + (i % 3), repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}
      {nodes.map((n, i) => (
        <motion.circle
          key={i}
          cx={n.cx} cy={n.cy} r={i === 6 ? "5" : "3"}
          fill={i === 6 ? "#14B8A6" : "#3B82F6"}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0.3, i === 6 ? 1 : 0.7, 0.3], scale: [1, 1.4, 1] }}
          transition={{ duration: 3 + (i % 2), repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
          style={{ filter: `drop-shadow(0 0 4px ${i === 6 ? "#14B8A6" : "#3B82F6"})` }}
        />
      ))}
    </svg>
  );
}

// ─── Blueprint grid background ────────────────────────────────────────────────
function Grid() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2.5, ease: "easeInOut" }}
      className="absolute inset-0 rounded-3xl overflow-hidden"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(100,116,139,0.08) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(100,116,139,0.08) 1px, transparent 1px)
        `,
        backgroundSize: "36px 36px",
      }}
    />
  );
}

// ─── Single intelligence panel ────────────────────────────────────────────────
function Panel({ children, delay, floatY = 10, x = 0, y = 0, rotate = 0, width = "w-56", glowColor = "#14B8A6", zIndex = 10 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.92, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ position: "absolute", left: x, top: y, rotate, zIndex }}
      className={width}
    >
      <motion.div
        animate={{ y: [0, -floatY, 0] }}
        transition={{ duration: 5 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.04, rotate: 0, transition: { duration: 0.25 } }}
        className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-2xl p-4 shadow-[0_8px_32px_rgba(15,23,42,0.04)]"
      >
        <div className="relative">{children}</div>
      </motion.div>
    </motion.div>
  );
}

// ─── Intelligence visualization ───────────────────────────────────────────────
function IntelligenceViz() {
  return (
    <div className="relative w-full h-full animate-fade-in" style={{ minHeight: "480px" }}>
      <Grid />
      <NetworkSVG />

      {/* Panel 1 — Compliance Intelligence */}
      <Panel delay={0.6} floatY={8} x="2%" y="4%" rotate={-2} width="w-56" glowColor="#14B8A6" zIndex={12}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200/50 flex items-center justify-center">
            <ShieldCheck size={14} className="text-teal-650" />
          </div>
          <span className="text-[11px] font-bold tracking-wide text-slate-800">Compliance Check</span>
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="space-y-2">
          {[
            { name: "UPS Efficiency Specs", pct: 95, color: "bg-teal-500" },
            { name: "Autonomy Rating", pct: 88, color: "bg-indigo-500" },
            { name: "IP Ingress Protection", pct: 60, color: "bg-amber-500" }
          ].map((item, i) => (
            <div key={i} className="space-y-0.5">
              <div className="flex justify-between text-[9px] font-semibold text-slate-500">
                <span>{item.name}</span>
                <span>{item.pct}% Match</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.pct}%` }}
                  transition={{ duration: 1.2, delay: 1.2 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className={`h-full rounded-full ${item.color}`}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Panel 2 — Schedule Risk */}
      <Panel delay={0.9} floatY={12} x="48%" y="1%" rotate={1.5} width="w-60" glowColor="#F59E0B" zIndex={11}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/50 flex items-center justify-center">
            <Clock size={14} className="text-amber-600" />
          </div>
          <span className="text-[11px] font-bold tracking-wide text-slate-800">Schedule Risk</span>
          <span className="ml-auto text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Live</span>
        </div>
        <div className="h-12 flex items-end gap-1 mb-2">
          {[40, 25, 45, 60, 35, 70, 50, 85].map((val, idx) => (
            <div key={idx} className="flex-1 bg-slate-100 rounded-t h-full flex items-end">
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${val}%` }}
                transition={{ duration: 0.8, delay: 1.4 + idx * 0.08 }}
                className={`w-full rounded-t ${idx === 7 ? "bg-red-450" : "bg-amber-500"}`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
          <span><Counter to={8} delay={1.6} /> tasks flagged</span>
          <span className="text-red-500 font-bold">High delay risk</span>
        </div>
      </Panel>

      {/* Panel 3 — Project Health */}
      <Panel delay={1.2} floatY={6} x="4%" y="48%" rotate={0} width="w-56" glowColor="#22C55E" zIndex={13}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/50 flex items-center justify-center">
            <Cpu size={14} className="text-emerald-600" />
          </div>
          <span className="text-[11px] font-bold text-slate-800">Project Health</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
              <circle cx="28" cy="28" r="22" fill="none" stroke="#E2E8F0" strokeWidth="5" />
              <circle cx="28" cy="28" r="22" fill="none" stroke="#10B981" strokeWidth="5" strokeDasharray="138" strokeDashoffset="30" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-800">
              <Counter to={78} suffix="%" delay={1.8} duration={1.4} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Critical NCRs</div>
            <div className="text-2xl font-black text-red-500 leading-none">
              <Counter to={3} delay={2.0} />
            </div>
            <div className="text-[10px] font-semibold text-emerald-600">✓ 11 open resolved</div>
          </div>
        </div>
      </Panel>

      {/* Panel 4 — RFI Intelligence */}
      <Panel delay={1.5} floatY={14} x="50%" y="46%" rotate={-1} width="w-52" glowColor="#3B82F6" zIndex={10}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/50 flex items-center justify-center">
            <HelpCircle size={14} className="text-blue-600" />
          </div>
          <span className="text-[11px] font-bold text-slate-800">RFI Intelligence</span>
        </div>
        <div className="space-y-2 text-[10px] font-medium leading-tight">
          <div className="bg-slate-100 border border-slate-200/40 rounded-xl rounded-tl-sm px-3 py-2 text-slate-700">
            Are there THDi spec requirements?
          </div>
          <div className="bg-teal-50 border border-teal-100 rounded-xl rounded-tr-sm px-3 py-2 text-teal-800 font-semibold">
            ✓ Yes, THDi must be &le; 5% at full load.
          </div>
        </div>
      </Panel>
    </div>
  );
}

// ─── Hero logo mark ───────────────────────────────────────────────────────────
function LogoMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-650 flex items-center justify-center shadow-md shadow-teal-500/10">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="2" width="7" height="7" rx="1.5" fill="white" opacity="0.95" />
          <rect x="11" y="2" width="7" height="7" rx="1.5" fill="white" opacity="0.55" />
          <rect x="2" y="11" width="7" height="7" rx="1.5" fill="white" opacity="0.55" />
          <rect x="11" y="11" width="7" height="7" rx="1.5" fill="white" opacity="0.95" />
        </svg>
      </div>
      <div>
        <div className="text-base font-extrabold tracking-tight text-slate-900 leading-none">DCPI</div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Platform</div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-white min-h-screen flex flex-col">
      {/* ─── Hero Section ─── */}
      <section className="relative w-full min-h-[90vh] flex items-center overflow-hidden bg-slate-50/50 border-b border-slate-100">
        {/* Blueprint grid full-page */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(100,116,139,0.035) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(100,116,139,0.035) 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px",
          }}
        />
        
        {/* Ambient glows */}
        <div className="absolute top-0 left-0 w-[50vw] h-[50vh] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[40vw] h-[40vh] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

        {/* Landing Header */}
        <header className="absolute top-0 left-0 w-full h-20 px-6 lg:px-12 flex items-center justify-between z-30">
          <LogoMark />
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="px-5 py-2 rounded-full text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all"
            >
              Start Free
            </button>
          </div>
        </header>

        <div className="max-w-[1600px] mx-auto w-full px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-0 items-center pt-24 pb-12">
          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col gap-6 relative z-20">
            
            {/* Status badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-teal-200/80 bg-teal-50/80 text-[10px] font-bold uppercase tracking-widest text-teal-700 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              AI Project Intelligence
            </div>

            {/* Headline */}
            <div>
              <h1 className="font-black leading-[1.05] tracking-tight text-slate-900 text-4xl sm:text-5xl lg:text-[56px] xl:text-[64px]" style={{ fontFamily: "'Inter', sans-serif" }}>
                The AI Engine <br />
                for Data Centre <br />
                <span className="bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-650 bg-clip-text text-transparent">Project Intelligence</span>
              </h1>
            </div>

            {/* Description */}
            <p className="text-base text-slate-500 leading-relaxed max-w-lg font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
              From compliance deviations to schedule risk — DCPI transforms
              construction documents into real-time, actionable intelligence.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3 items-center mt-2">
              <button
                onClick={() => navigate("/login")}
                className="relative overflow-hidden flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white shadow-lg shadow-teal-500/10 transition-all hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #14B8A6, #0891b2)" }}
              >
                <span>Enter Workspace</span>
                <ArrowRight size={15} />
              </button>

              <button
                onClick={() => navigate("/signup")}
                className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/40 shadow-sm transition-all hover:scale-[1.02]"
              >
                <span>Start Your Project</span>
              </button>
            </div>

            {/* Social proof strip */}
            <div className="flex items-center gap-8 pt-6 border-t border-slate-200/60 mt-4">
              {[
                { label: "Compliance Checks", value: "147+" },
                { label: "Projects Managed", value: "12" },
                { label: "Average Accuracy", value: "98.2%" },
              ].map(({ label, value }, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-lg font-black text-slate-800 leading-none">{value}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN — asymmetric intelligence viz ── */}
          <div className="relative hidden lg:block" style={{ height: "520px" }}>
            <IntelligenceViz />
          </div>
        </div>
      </section>

      {/* ─── Platform Capabilities Showcase ─── */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-teal-600">Platform Architecture</h2>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">Four Dedicated AI Agents. Real-time control.</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              DCPI runs localized, context-aware AI agents designed specifically for the unique quality, engineering, schedule, and logistical demands of complex data centre construction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Compliance Agent",
                desc: "Upload master specifications and vendor submittals. The agent extracts constraints, compares values, and raises NCR flags automatically.",
                icon: <ShieldCheck className="text-teal-650" size={20} />,
                color: "bg-teal-50/50 border-teal-100 text-teal-700",
                features: ["Deviation metrics", "NCR severity grading", "Technical parameter verification"]
              },
              {
                title: "Schedule Risk Agent",
                desc: "Detect potential delays in critical path tasks. Imports standard gantt charts and analyzes historical float risk days automatically.",
                icon: <Clock className="text-amber-600" size={20} />,
                color: "bg-amber-50/50 border-amber-100 text-amber-700",
                features: ["Critical path analysis", "Delay probability scoring", "Intelligent mitigation steps"]
              },
              {
                title: "RFI Copilot Agent",
                desc: "An intelligent engineering chatbot context-aware of all specification clauses, historic precedents, and engineering standards.",
                icon: <HelpCircle className="text-blue-600" size={20} />,
                color: "bg-blue-50/50 border-blue-100 text-blue-700",
                features: ["Clause-level source citation", "Precedent RFI matching", "Draft response constructor"]
              },
              {
                title: "Commissioning Copilot",
                desc: "Translates technical specs into granular field checklist records. QA engineers can perform startup verification run steps live.",
                icon: <Cpu className="text-purple-650" size={20} />,
                color: "bg-purple-50/50 border-purple-100 text-purple-700",
                features: ["Acceptance criteria checks", "Startup record ledger", "Mitigation recommendation"]
              }
            ].map((agent, i) => (
              <div 
                key={i} 
                className="bg-slate-50/50 border border-slate-200/60 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-300 hover:bg-slate-50 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-sm"
              >
                <div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${agent.color} mb-4`}>
                    {agent.icon}
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-base mb-2">{agent.title}</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">{agent.desc}</p>
                </div>
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  {agent.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                      <Check size={11} className="text-emerald-500" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer Section ─── */}
      <footer className="py-8 bg-slate-50/50 border-t border-slate-100 mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
          <div>© {new Date().getFullYear()} DCPI Platform. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-655 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-655 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-655 transition-colors">Security Standards</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
