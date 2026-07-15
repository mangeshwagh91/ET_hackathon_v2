import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform, animate } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Zap, ShieldCheck, Clock, FileText, Check,
  Mail, Truck, AlertTriangle, Search, LayoutGrid, Terminal,
  Send, User, BarChart3, HelpCircle, ChevronRight, Settings,
  Eye, RefreshCw, Layers
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
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [to, delay, duration]);
  return <>{val}{suffix}</>;
}

// ─── Reusable Mockup Container (looks like a clean macOS window) ────────────────
function MacWindow({ children, title = "dcpi-workspace" }) {
  return (
    <div className="w-full rounded-xl bg-[#131413] border border-[#232326] shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden">
      {/* Window Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d0d0f] border-b border-[#232326] select-none">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#F2AF48]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
        </div>
        <span className="text-[11px] font-mono text-[#8A8D8A] tracking-wider font-semibold">{title}</span>
        <div className="w-12" /> {/* spacer to center title */}
      </div>
      {/* Window Body */}
      <div className="p-6 relative bg-[#181A19]">
        {children}
      </div>
    </div>
  );
}

// ─── Main Landing Page ───────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("bidding");

  // Interactive Simulation States
  const [selectedBid, setSelectedBid] = useState("Delta");
  const [ncrResult, setNcrResult] = useState(null);
  const [ncrLoading, setNcrLoading] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailStatus, setEmailStatus] = useState("idle");
  const [truckDelay, setTruckDelay] = useState(false);

  const tabs = [
    { id: "bidding", label: "Vendor Bidding", icon: <Layers size={14} /> },
    { id: "compliance", label: "Compliance Scan", icon: <ShieldCheck size={14} /> },
    { id: "email", label: "Email Ingestion", icon: <Mail size={14} /> },
    { id: "logistics", label: "GPS Telemetry", icon: <Truck size={14} /> }
  ];

  return (
    <div className="min-h-screen bg-[#131413] text-[#EDEFEE] font-sans overflow-x-hidden selection:bg-[#2A2C2A]">

      {/* ─── Minimal Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 bg-[#131413]/80 backdrop-blur-md border-b border-[#2A2C2A]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <LayoutGrid size={15} className="text-black stroke-[2.5px]" />
          </div>
          <div>
            <span className="font-extrabold text-white text-[15px] tracking-tight leading-none block">DataForge AI</span>
            <span className="text-[9px] text-[#8A8D8A] tracking-widest uppercase font-bold mt-0.5">Platform</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => navigate("/login")} className="text-xs font-semibold text-[#8A8D8A] hover:text-white transition-colors">
            Sign In
          </button>
          <button
            onClick={() => navigate("/login")}
            className="landing-btn-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
          >
            Start Free
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-36 pb-24 z-10 relative">

        {/* ─── Hero Section ─── */}
        <div className="flex flex-col lg:flex-row items-center gap-16 min-h-[75vh] mb-20">
          {/* Left Text */}
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181A19] border border-[#232323] text-[#8A8D8A] text-[11px] font-bold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#249361]" />
              Data Centre Engine
            </div>

            <h1 className="text-4xl lg:text-[64px] font-extrabold tracking-tight text-white leading-[1.05]">
              The AI Engine <br />
              for Infrastructure <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#EDEFEE] to-[#8A8D8A]">
                Project Intelligence
              </span>
            </h1>

            <p className="text-base text-[#8A8D8A] max-w-lg leading-relaxed">
              Enforce specifications, run TIA-942 audits, ingest site emails, and track equipment delivery paths instantly in a unified, modern interface.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <button
                onClick={() => navigate("/login")}
                className="w-full sm:w-auto landing-btn-white px-6 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                Launch Workspace
                <ArrowRight size={16} />
              </button>
              <a
                href="#playground"
                className="w-full sm:w-auto bg-[#131413] border border-[#2A2C2A] hover:border-[#8A8D8A] text-[#EDEFEE] px-6 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center"
              >
                Try Sandbox
              </a>
            </div>
          </div>

          {/* Right Showcase: High-Fidelity Mock Interface (Replaces floating cards for cleanliness) */}
          <div className="flex-1 w-full max-w-[520px]">
            <MacWindow title="dcpi-dashboard">
              <div className="space-y-5">
                {/* Simulated Header */}
                <div className="flex justify-between items-center pb-3 border-b border-[#2A2C2A]">
                  <div>
                    <div className="text-[10px] text-[#8A8D8A] font-bold uppercase tracking-wider">Project</div>
                    <div className="text-white text-xs font-bold">DataForge AI West Coast build</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#3ECF8E]/10 text-[#3ECF8E] border border-[#3ECF8E]/20 text-[10px] font-bold">98% Match</span>
                </div>

                {/* Simulated Grid Rows */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-[#181A19] border border-[#232323] rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E]" />
                      <span className="text-xs font-semibold text-white">Delta UPS Installation</span>
                    </div>
                    <span className="text-[10px] text-[#8A8D8A] font-mono">Compliant</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#181A19] border border-[#232323] rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs font-semibold text-white">Carrier Telemetry Trk-99</span>
                    </div>
                    <span className="text-[10px] text-amber-500 font-bold">Delay Risk</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#181A19] border border-[#232323] rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-xs font-semibold text-white">Clearance scan</span>
                    </div>
                    <span className="text-[10px] text-red-500 font-bold">1 Deviation</span>
                  </div>
                </div>

                {/* Progress Mini Bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-[10px] text-[#8A8D8A] font-bold mb-1">
                    <span>TIA-942 Compliance</span>
                    <span className="text-white">92% audit completion</span>
                  </div>
                  <div className="h-1 bg-[#1a1a1f] rounded-full overflow-hidden">
                    <div className="h-full bg-white w-[92%]" />
                  </div>
                </div>
              </div>
            </MacWindow>
          </div>
        </div>

        {/* ─── Flat Minimal Stats Bar ─── */}
        <div className="border-t border-[#2A2C2A] py-10 mb-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="text-2xl font-bold text-white mb-1"><Counter to={147} suffix="+" /></div>
            <div className="text-[10px] font-bold text-[#8A8D8A] uppercase tracking-wider">Compliance Runs</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white mb-1"><Counter to={12} delay={0.2} /></div>
            <div className="text-[10px] font-bold text-[#8A8D8A] uppercase tracking-wider">Active Workspace</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white mb-1"><Counter to={98} suffix=".2%" delay={0.4} /></div>
            <div className="text-[10px] font-bold text-[#8A8D8A] uppercase tracking-wider">Accuracy Score</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white mb-1"><Counter to={4} suffix="h Alert" delay={0.6} /></div>
            <div className="text-[10px] font-bold text-[#8A8D8A] uppercase tracking-wider">Average Lead Time</div>
          </div>
        </div>

        {/* ─── INTERACTIVE SANDBOX PLAYGROUND ─── */}
        <section id="playground" className="scroll-mt-24 py-12 mb-20">
          <div className="max-w-2xl mb-12 space-y-3">
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Interactive sandbox demo
            </h2>
            <p className="text-[#8A8D8A] text-sm">
              Use the tab controls below to simulate core platform workflows. Toggle options and see parsed specifications and compliance reports update dynamically.
            </p>
          </div>

          <div className="bg-[#181A19] border border-[#2A2C2A] rounded-2xl p-6 lg:p-8 relative">
            {/* Minimal Segment Control Tab Bar */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-[#2A2C2A] pb-6 mb-8">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === t.id
                      ? "bg-white text-black font-extrabold"
                      : "bg-[#181A19] border border-[#232323] text-[#8A8D8A] hover:text-white"
                    }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-10 items-stretch">

              {/* Left Column: Sandbox Controls */}
              <div className="flex-1 flex flex-col justify-between py-2">
                <AnimatePresence mode="wait">

                  {activeTab === "bidding" && (
                    <motion.div
                      key="bid-controls"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <h3 className="text-lg font-bold text-white">Select and analyze bid sheets</h3>
                      <p className="text-xs text-[#8A8D8A] leading-relaxed">
                        Vendors submit machinery specs. The engine extracts constraints and lists matches based on clearances.
                      </p>
                      <div className="flex gap-2 pt-2">
                        {["Delta", "Schneider", "Eaton"].map(brand => (
                          <button
                            key={brand}
                            onClick={() => setSelectedBid(brand)}
                            className={`flex-1 py-2.5 rounded-lg text-xs border text-center transition-all ${selectedBid === brand
                                ? "bg-white/5 border-white text-white font-bold"
                                : "bg-[#131413] border-[#2A2C2A] text-[#8A8D8A] hover:text-white"
                              }`}
                          >
                            {brand}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "compliance" && (
                    <motion.div
                      key="compliance-controls"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <h3 className="text-lg font-bold text-white">Scan TIA-942 Guidelines</h3>
                      <p className="text-xs text-[#8A8D8A] leading-relaxed">
                        Cross-reference floorplan clearances against Data Center Tier regulations to isolate violations.
                      </p>
                      <button
                        onClick={() => {
                          setNcrLoading(true);
                          setTimeout(() => {
                            setNcrResult({
                              details: "Aisle containment space is 1.05m. Annex G regulations require min 1.2m clearance."
                            });
                            setNcrLoading(false);
                          }, 1000);
                        }}
                        disabled={ncrLoading}
                        className="w-full bg-[#3ECF8E] hover:bg-[#249361] text-black py-2.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {ncrLoading ? "Running Sweep..." : "Initiate Audit Run"}
                      </button>
                    </motion.div>
                  )}

                  {activeTab === "email" && (
                    <motion.div
                      key="email-controls"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <h3 className="text-lg font-bold text-white">Ingest FWD blueprints</h3>
                      <p className="text-xs text-[#8A8D8A] leading-relaxed">
                        Forward technical specs straight from site email attachments into the parsing workspace.
                      </p>
                      <div className="space-y-2 pt-1">
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="e.g., Delta UPS specification logs"
                          className="w-full bg-[#131413] border border-[#2A2C2A] rounded-lg px-4 py-2.5 text-xs text-white placeholder:text-[#8A8D8A] outline-none"
                        />
                        <button
                          onClick={() => {
                            if (!emailSubject) return;
                            setEmailStatus("sending");
                            setTimeout(() => {
                              setEmailStatus("parsed");
                            }, 1200);
                          }}
                          disabled={emailStatus === "sending" || !emailSubject}
                          className="w-full landing-btn-white font-bold py-2.5 rounded-lg text-xs transition-all disabled:opacity-50"
                        >
                          {emailStatus === "sending" ? "Processing..." : "Send FWD email"}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "logistics" && (
                    <motion.div
                      key="logistics-controls"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <h3 className="text-lg font-bold text-white">Logistics Delay Flagging</h3>
                      <p className="text-xs text-[#8A8D8A] leading-relaxed">
                        Simulate route bottlenecks to verify dynamic recalculations of machine arrival.
                      </p>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setTruckDelay(false)}
                          className={`flex-1 py-2.5 rounded-lg text-xs border text-center transition-all ${!truckDelay
                              ? "bg-white/5 border-white text-white font-bold"
                              : "bg-[#131413] border-[#2A2C2A] text-[#8A8D8A]"
                            }`}
                        >
                          Clear Route
                        </button>
                        <button
                          onClick={() => setTruckDelay(true)}
                          className={`flex-1 py-2.5 rounded-lg text-xs border text-center transition-all ${truckDelay
                              ? "bg-red-500/10 border-red-500 text-red-500 font-bold"
                              : "bg-[#131413] border-[#2A2C2A] text-[#8A8D8A]"
                            }`}
                        >
                          Trigger Traffic
                        </button>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Right Column: Console Mockup Panel */}
              <div className="flex-1 w-full">
                <MacWindow title="dcpi-terminal">
                  <div className="min-h-[220px] flex flex-col justify-center">
                    <AnimatePresence mode="wait">

                      {activeTab === "bidding" && (
                        <motion.div
                          key={`bid-card-${selectedBid}`}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="space-y-4 font-mono text-xs"
                        >
                          <div className="flex justify-between items-center px-4 py-2 bg-[#181A19] border-b border-[#2A2C2A]">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1A1]">RFI Impact Analysis</div>
                            <div className="flex gap-2">
                              <span className={`text-[10px] font-bold ${selectedBid === "Delta" ? "text-[#3ECF8E]" : "text-[#8A8D8A]"}`}>Delta Systems</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-white font-bold">{selectedBid === "Delta" ? "Delta MOD-500" : selectedBid === "Schneider" ? "Galaxy PX" : "Eaton Power-9"}</div>
                              <span className="text-[#8A8D8A] text-[10px]">Category: UPS Module</span>
                            </div>
                            <span className={`text-[10px] font-bold ${selectedBid === "Delta" ? "text-[#3ECF8E]" : "text-[#8A8D8A]"
                              }`}>
                              {selectedBid === "Delta" ? "98% Match" : selectedBid === "Schneider" ? "84% Match" : "79% Match"}
                            </span>
                          </div>

                          <div className="space-y-1.5 p-3 bg-[#181A19] border border-[#2A2C2A] rounded-lg">
                            <div className="flex justify-between text-[#8A8D8A]"><span className="text-[#8A8D8A]">Efficiency</span><span>{selectedBid === "Delta" ? "96.5%" : "94.8%"}</span></div>
                            <div className="flex justify-between text-[#8A8D8A]"><span className="text-[#8A8D8A]">Lead Time</span><span>{selectedBid === "Delta" ? "4 Weeks" : "8 Weeks"}</span></div>
                          </div>

                          <div className="text-[#8A8D8A] text-[11px]">
                            {selectedBid === "Delta" ? "✓ Verified compliance parameters." : "⚠ Width exceeds clearance space."}
                          </div>
                        </motion.div>
                      )}

                      {activeTab === "compliance" && (
                        <motion.div
                          key="compliance-status"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="space-y-4 font-mono text-xs"
                        >
                          {!ncrResult && !ncrLoading && (
                            <div className="text-center text-[#8A8D8A] py-8">&lt; Sweep Idle &gt;</div>
                          )}

                          {ncrLoading && (
                            <div className="space-y-2">
                              <div className="text-white">Analyzing clearances...</div>
                              <div className="h-0.5 bg-[#181A19] rounded overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1 }} className="h-full bg-white" />
                              </div>
                            </div>
                          )}

                          {ncrResult && !ncrLoading && (
                            <div className="space-y-3">
                              <div className="text-red-500 font-bold flex items-center gap-1.5">
                                <AlertTriangle size={14} /> Deviation isolated
                              </div>
                              <div className="p-3 bg-[#170e0e] border border-red-900/20 text-red-400 rounded-lg">
                                {ncrResult.details}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {activeTab === "email" && (
                        <motion.div
                          key="email-status"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="space-y-4 font-mono text-xs"
                        >
                          {emailStatus === "idle" && (
                            <div className="text-center text-[#8A8D8A] py-8">&lt; Awaiting forwarding trigger &gt;</div>
                          )}

                          {emailStatus === "sending" && (
                            <div className="text-white">Connecting SMTP & parsing attachment payload...</div>
                          )}

                          {emailStatus === "parsed" && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-3 p-3 bg-[#181A19] border border-[#2A2C2A] rounded-lg">
                                <FileText size={16} className="text-[#8A8D8A]" />
                                <div>
                                  <div className="text-white font-bold text-[11px] truncate">{emailSubject}</div>
                                  <div className="text-[10px] text-[#8A8D8A]">Payload: spec_sheet.pdf</div>
                                </div>
                              </div>
                              <div className="text-[#3ECF8E] font-bold">✓ PDF processed. Specs added to workspace.</div>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {activeTab === "logistics" && (
                        <motion.div
                          key={`logistics-status-${truckDelay}`}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="space-y-4 font-mono text-xs"
                        >
                          <div className="h-16 bg-[#181A19] border border-[#2A2C2A] rounded-lg relative overflow-hidden flex items-center justify-center">
                            <div className="absolute w-[80%] h-0.5 bg-[#232326] rounded-full overflow-hidden">
                              <div className={`h-full ${truckDelay ? 'bg-red-500' : 'bg-white'} w-[60%]`} />
                            </div>
                            <div className={`absolute left-[60%] -ml-3 w-6 h-6 rounded-full border bg-black flex items-center justify-center ${truckDelay ? 'border-red-500' : 'border-white'
                              }`}>
                              <Truck size={10} className={truckDelay ? 'text-red-500' : 'text-white'} />
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-[#8A8D8A]">UPS Carrier: Trk-9912</span>
                            <span className={truckDelay ? 'text-red-500 font-bold' : 'text-[#3ECF8E] font-bold'}>
                              {truckDelay ? 'Incident Detected' : 'Clear Route'}
                            </span>
                          </div>

                          {truckDelay && (
                            <div className="p-2.5 bg-[#170e0e] border border-red-900/20 text-red-400 rounded-lg">
                              Alert: weather issue on Route 40. Arrival time: +4h.
                            </div>
                          )}
                        </motion.div>
                      )}

                    </AnimatePresence>
                  </div>
                </MacWindow>
              </div>

            </div>
          </div>
        </section>

        {/* ─── Premium Accordion FAQ ─── */}
        <section className="py-12 mb-20 max-w-3xl mx-auto border-t border-[#2A2C2A]">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-white">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {[
              { q: "How does compliance verification work?", a: "The engine parses specs on upload, checking dimensions and performance bounds against rules defined by Data Center Standards (BICSI / TIA-942)." },
              { q: "Can we interface with logistics carriers?", a: "Yes, DataForge AI connects with freight telemetry nodes, using transit weather models to dynamically forecast delays." },
              { q: "How is the project email configured?", a: "Each workspace configures a dedicated ingestion alias (e.g., project@dcpi.ai) that scans, checks, and loads emailed attachments." }
            ].map((faq, i) => (
              <div key={i} className="bg-[#181A19] border border-[#2A2C2A] rounded-xl p-5">
                <h4 className="text-sm font-bold text-white mb-1.5">{faq.q}</h4>
                <p className="text-xs text-[#8A8D8A] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── CTA Call to Action ─── */}
        <section className="border border-[#2A2C2A] rounded-2xl p-10 text-center space-y-5 bg-[#181A19] relative overflow-hidden">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-white">
            Ready to Optimize Your Infrastructure?
          </h2>
          <p className="text-[#8A8D8A] max-w-md mx-auto text-xs leading-relaxed">
            Get instant vendor match rankings, continuous compliance monitoring, and telemetry warnings on one unified workspace.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate("/login")}
              className="landing-btn-white font-bold px-6 py-3 rounded-lg text-xs transition-all inline-flex items-center gap-1.5"
            >
              Start Your Project Free
              <ArrowRight size={14} />
            </button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#2A2C2A] py-8 text-center text-[10px] text-[#8A8D8A] font-semibold uppercase tracking-widest bg-[#131413]">
        <p>© 2026 DataForge AI. Crafted for optimal performance.</p>
      </footer>
    </div>
  );
}
