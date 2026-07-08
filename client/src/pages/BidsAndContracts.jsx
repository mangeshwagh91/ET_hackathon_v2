import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, X, ShieldAlert, Award, FileText, BarChart3, AlertCircle, RefreshCw, Landmark, Package, MapPin, Truck, Clock, Bell } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import api from "../api/client.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

export default function BidsAndContracts() {
  const { currentProject, projects, setCurrentProject, fetchProjects } = useWorkspace();
  const [bids, setBids] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recLoading, setRecLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [activeTab, setActiveTab] = useState("bids"); // bids | supply-chain
  const [shipments, setShipments] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [scLoading, setScLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchSupplyChain();
  }, []);

  useEffect(() => {
    if (currentProject) {
      fetchBidsAndRecommendations();
    }
  }, [currentProject]);

  const fetchBidsAndRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const bidData = await api.getBids(currentProject.id);
      setBids(bidData);
      setRecommendations(null); // Reset recommendations until recalculated
    } catch (err) {
      setError(err.message || "Failed to fetch bids");
    } finally {
      setLoading(false);
    }
  };

  const getAIRecommendations = async () => {
    if (!currentProject) return;
    setRecLoading(true);
    setError(null);
    try {
      const recData = await api.getBidRecommendations(currentProject.id);
      setRecommendations(recData.recommendations || []);
    } catch (err) {
      setError(err.message || "Failed to get AI Recommendations");
    } finally {
      setRecLoading(false);
    }
  };

  const handleAction = (bidId, status) => {
    setActionMessage(`Bid ${status === 'accepted' ? 'approved' : 'rejected'} successfully!`);
    setTimeout(() => setActionMessage(""), 3000);
  };

  const fetchSupplyChain = async () => {
    setScLoading(true);
    try {
      const [shipData, alertData] = await Promise.all([
        api.getSupplyChainShipments(),
        api.getSupplyChainAlerts(),
      ]);
      setShipments(shipData);
      setAlerts(alertData);
    } catch (err) {
      console.warn("Supply chain fetch failed:", err.message);
    } finally {
      setScLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 text-slate-800 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Contracts & Vendor Bids</h1>
          <p className="text-slate-500 text-sm mt-1">Analyze, compare, and approve vendor equipment bids using Procurement Agents.</p>
        </div>
        
        {/* Project Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project:</label>
          <select
            value={currentProject?.id || ""}
            onChange={(e) => {
              const selected = projects.find(p => p.id === e.target.value);
              if (selected) setCurrentProject(selected);
            }}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-50 p-1 rounded-xl border border-slate-200 w-fit">
        {[
          { id: "bids", label: "Vendor Bids", icon: <Landmark size={14} /> },
          { id: "supply-chain", label: "Supply Chain", icon: <Truck size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-white text-emerald-600 border border-slate-200 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {actionMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-700 mb-6 text-sm font-semibold"
        >
          {actionMessage}
        </motion.div>
      )}

      {/* Supply Chain Tab */}
      {activeTab === "supply-chain" && (
        <div className="space-y-6">
          {/* Alert Banner */}
          {alerts && alerts.critical > 0 && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-650">
              <Bell size={18} />
              <strong>{alerts.critical} CRITICAL</strong> supply chain delays detected — items overdue or &lt;7 days to required date.
            </div>
          )}

          {/* Stats Row */}
          {shipments && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Shipments", value: shipments.total, color: "text-blue-600" },
                { label: "In Transit", value: shipments.in_transit, color: "text-amber-600" },
                { label: "Delayed", value: shipments.delayed, color: "text-red-500" },
                { label: "Delivered", value: shipments.delivered, color: "text-emerald-600" },
              ].map((s) => (
                <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-slate-400 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Geospatial Map (SVG) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-emerald-600" />
              <h3 className="font-semibold text-slate-800 text-sm">Supplier Origins Map</h3>
            </div>
            <div className="relative w-full h-48 bg-slate-50 rounded-xl overflow-hidden border border-slate-200/80">
              {/* Simplified World Map SVG */}
              <svg viewBox="0 0 800 400" className="w-full h-full opacity-60">
                <rect width="800" height="400" fill="#f8fafc" />
                {/* Very simplified continent outlines */}
                <path d="M 60 80 L 200 60 L 220 150 L 160 200 L 60 180 Z" fill="#e2e8f0" />
                <path d="M 220 60 L 400 40 L 420 180 L 300 200 L 220 150 Z" fill="#e2e8f0" />
                <path d="M 400 40 L 560 50 L 580 200 L 440 220 L 400 180 Z" fill="#e2e8f0" />
                <path d="M 560 50 L 700 60 L 720 180 L 600 200 L 560 150 Z" fill="#e2e8f0" />
                <path d="M 100 200 L 200 195 L 220 320 L 140 340 L 80 300 Z" fill="#e2e8f0" />
                <path d="M 240 200 L 380 190 L 400 340 L 300 360 L 240 320 Z" fill="#e2e8f0" />
                <path d="M 420 300 L 540 280 L 560 380 L 460 390 L 420 360 Z" fill="#e2e8f0" />
              </svg>

              {/* Supplier location dots */}
              {shipments?.shipments && [...new Map(
                shipments.shipments.map(s => [s.vendor_country, s])
              ).values()].map((s, i) => {
                // Map country to rough SVG position
                const positions = {
                  "India": { x: 58, y: 48 }, "China": { x: 70, y: 35 },
                  "Germany": { x: 45, y: 28 }, "USA": { x: 18, y: 35 },
                  "Japan": { x: 78, y: 38 }, "South Korea": { x: 76, y: 36 },
                  "Taiwan": { x: 73, y: 42 }, "Sweden": { x: 46, y: 22 },
                  "Italy": { x: 47, y: 32 }, "UK": { x: 43, y: 25 },
                };
                const pos = positions[s.vendor_country] || { x: 50, y: 40 };
                const isDelayed = s.tracking?.is_delayed;
                return (
                  <div
                    key={s.vendor_country}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  >
                    <div className={`w-3 h-3 rounded-full border-2 border-white shadow-lg ${isDelayed ? 'bg-red-500' : 'bg-emerald-400'} animate-pulse`} />
                    <span className="text-xs text-slate-800 font-bold mt-0.5 bg-white/90 border border-slate-200 px-1 rounded whitespace-nowrap">
                      {s.vendor_country}
                    </span>
                    {/* Line to destination */}
                    <div className="absolute w-px h-8 bg-emerald-400/20 top-3 left-1/2" />
                  </div>
                );
              })}

              {/* Destination — Project Site */}
              <div className="absolute" style={{ left: "58%", top: "50%" }}>
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
                <span className="text-xs text-slate-800 font-bold bg-white/90 border border-slate-200 px-1 rounded whitespace-nowrap">Project Site</span>
              </div>

              <div className="absolute top-2 right-2 flex gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> On Time</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Delayed</span>
              </div>
            </div>
          </div>

          {/* Shipment Cards */}
          {scLoading ? (
            <LoadingSpinner message="Loading shipments..." />
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                <Package size={16} className="text-slate-400" /> Shipment Tracking
              </h3>
              {(shipments?.shipments || []).map((s) => {
                const pct = ((s.tracking.status_index + 1) / s.tracking.total_stages) * 100;
                const isDelayed = s.tracking.is_delayed;
                const sev = s.criticality === "HIGH" ? "text-red-500" : s.criticality === "MEDIUM" ? "text-amber-600" : "text-slate-500";
                return (
                  <motion.div
                    key={s.po_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white border rounded-xl p-4 shadow-sm ${isDelayed ? 'border-red-500/35' : 'border-slate-200'}`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono text-slate-450">{s.po_number}</span>
                          <span className={`text-xs font-bold ${sev}`}>{s.criticality}</span>
                          {isDelayed && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700">⚠ DELAYED {s.tracking.delay_days}d</span>}
                        </div>
                        <p className="text-slate-800 text-sm font-medium">{s.equipment_description || s.equipment_class}</p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          <MapPin size={11} className="inline animate-pulse text-slate-400" /> {s.vendor_name} · {s.vendor_country} ({s.geo.origin_port})
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">{s.tracking.status}</div>
                        {s.tracking.eta && <div className="text-xs text-slate-400">ETA: {s.tracking.eta}</div>}
                        {s.tracking.days_remaining != null && (
                          <div className={`text-xs font-bold mt-0.5 ${s.tracking.days_remaining < 7 ? 'text-red-500' : s.tracking.days_remaining < 14 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {s.tracking.days_remaining < 0 ? `${Math.abs(s.tracking.days_remaining)}d overdue` : `${s.tracking.days_remaining}d left`}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Order Confirmed</span>
                        <span>Delivered</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8 }}
                          className={`h-full rounded-full ${isDelayed ? 'bg-red-500' : 'bg-emerald-500'}`}
                        />
                      </div>
                    </div>
                    {/* Supplier Tiers */}
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {s.supplier_tiers.map((tier) => (
                        <span key={tier.tier} className="text-xs px-2 py-0.5 bg-slate-50 rounded-full text-slate-650 border border-slate-200">
                          T{tier.tier}: {tier.name}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
              {(!shipments?.shipments || shipments.shipments.length === 0) && (
                <div className="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <Truck size={40} className="mx-auto mb-3 opacity-30 text-slate-400" />
                  <p>No purchase orders found. Upload submittals to populate supply chain data.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "bids" && (
      <>
      {loading ? (
        <LoadingSpinner message="Fetching vendor bids..." />
      ) : bids.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Landmark className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No Bids Submitted Yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2 leading-relaxed">
            Once vendors submit equipment catalogs and bidding prices for this project, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: Bids List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-emerald-500" />
                Submitted Bids ({bids.length})
              </h2>
              <button 
                onClick={fetchBidsAndRecommendations}
                className="p-2 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors text-slate-500 hover:text-slate-800"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="space-y-4">
              {bids.map(bid => (
                <motion.div
                  key={bid.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-300 transition-colors shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-800">Bid ID: {bid.id.slice(0, 8).toUpperCase()}</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full">{bid.status}</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600">${bid.price.toLocaleString()}</div>
                    <div className="text-xs text-slate-550">
                      Lead Time: <span className="font-semibold text-slate-850">{bid.lead_time_days} days</span>
                    </div>
                    <div className="text-xs text-slate-450 max-w-md truncate">
                      Catalog: {bid.equipment_catalog_json}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleAction(bid.id, "accepted")}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Check size={14} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(bid.id, "rejected")}
                      className="bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <X size={14} />
                      Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: AI Intelligence Panel */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Award size={18} className="text-emerald-500" />
              AI Recommendation
            </h2>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-6 shadow-sm">
              {!recommendations ? (
                <div className="text-center py-8 space-y-4">
                  <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Instantly analyze all vendor bids on price, quality, specs, and schedule risk through Procurement Agent.
                  </p>
                  <button
                    onClick={getAIRecommendations}
                    disabled={recLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    {recLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <BarChart3 size={14} />
                        Run Agent Evaluation
                      </>
                    )}
                  </button>
                </div>
              ) : recommendations.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Evaluation yielded no definitive recommendations.</p>
              ) : (
                <div className="space-y-6">
                  {recommendations.map((rec, i) => (
                    <motion.div
                      key={rec.vendor_name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="border-b border-slate-200 pb-6 last:border-b-0 last:pb-0 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-800">{rec.vendor_name}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${rec.recommendation === 'RECOMMENDED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-550'}`}>
                          {rec.recommendation}
                        </span>
                      </div>

                      {/* Attribute Scores */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Price</div>
                          <div className="text-sm font-extrabold text-slate-800">{rec.price_score}/10</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Compliance</div>
                          <div className="text-sm font-extrabold text-slate-800">{rec.compliance_score}/10</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Lead Time</div>
                          <div className="text-sm font-extrabold text-slate-800">{rec.lead_time_score}/10</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Quality</div>
                          <div className="text-sm font-extrabold text-slate-800">{rec.quality_score}/10</div>
                        </div>
                      </div>

                      <div className="text-xs leading-relaxed text-slate-600">
                        <span className="font-bold text-slate-700">Justification:</span> {rec.justification}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
      </>
      )}
    </div>
  );
}
