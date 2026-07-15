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

  const handleAction = async (bidId, status) => {
    try {
      const dbStatus = status === 'accepted' ? 'approved' : 'rejected';
      await api.updateBidStatus(bidId, dbStatus);
      
      setActionMessage(`Bid ${dbStatus} successfully!`);
      
      // Update local state to reflect the new status
      setBids(prev => prev.map(b => b.id === bidId ? { ...b, status: dbStatus } : b));
      
      setTimeout(() => setActionMessage(""), 3000);
    } catch (err) {
      console.error("Error updating bid status:", err);
      setActionMessage(`Failed to update bid: ${err.message}`);
      setTimeout(() => setActionMessage(""), 3000);
    }
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
    <div className="flex-1 w-full h-full relative bg-[#131413] overflow-hidden flex flex-col">
      <div className="flex-1 flex overflow-hidden relative z-10 w-full">
        
        {/* Left Panel: Sidebar */}
        <div className="w-[240px] flex-none bg-[#131413] border-r border-[#2A2C2A] flex flex-col overflow-hidden hidden lg:flex">
          {/* Sidebar Header */}
          <div className="h-12 border-b border-[#2A2C2A] bg-[#181A19] flex items-center px-4 flex-shrink-0">
            <h1 className="text-[13px] font-bold text-white tracking-wide uppercase">Procurement</h1>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6">
            {/* Project Selector */}
            <div>
              <label className="block text-[10px] font-bold text-[#8A8D8A] uppercase tracking-wider mb-2 flex items-center gap-2">
                <Landmark size={12} /> Active Project
              </label>
              <select
                value={currentProject?.id || ""}
                onChange={(e) => {
                  const selected = projects.find(p => p.id === e.target.value);
                  if (selected) setCurrentProject(selected);
                }}
                className="w-full bg-[#181A19] border border-[#2A2C2A] rounded-md px-3 py-2 text-sm text-[#EDEFEE] focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Navigation Tabs */}
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#8A8D8A] mb-2 flex items-center gap-2">
                <FileText size={12} /> Categories
              </h2>
              <div className="space-y-1">
                {[
                  { id: "bids", label: "Vendor Bids", icon: <Landmark size={14} /> },
                  { id: "supply-chain", label: "Supply Chain", icon: <Truck size={14} /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                      activeTab === tab.id
                        ? "bg-[#181A19] border border-[#2A2C2A] text-emerald-500 shadow-sm"
                        : "border border-transparent text-[#8A8D8A] hover:bg-[#131413] hover:text-[#EDEFEE]"
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Main Content */}
        <div className="flex-1 flex flex-col bg-[#131413] relative overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* Header inside Main Content */}
              <div className="mb-8 border-b border-[#2A2C2A] pb-6">
                <h1 className="text-2xl font-bold text-[#EDEFEE]">Contracts & Vendor Bids</h1>
                <p className="text-[#8A8D8A] text-sm mt-1">Analyze, compare, and approve vendor equipment bids using Procurement Agents.</p>
              </div>

              {actionMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-md bg-emerald-950/30 border border-emerald-900 text-emerald-400 mb-6 text-xs font-semibold"
                >
                  {actionMessage}
                </motion.div>
              )}

              {/* Supply Chain Tab */}
              {activeTab === "supply-chain" && (
                <div className="space-y-6">
                  {/* Alert Banner */}
                  {alerts && alerts.critical > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-red-950/30 border border-red-900 rounded-xl text-red-400">
                      <Bell size={18} />
                      <strong>{alerts.critical} CRITICAL</strong> supply chain delays detected — items overdue or &lt;7 days to required date.
                    </div>
                  )}

                  {/* Stats Row */}
                  {shipments && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Total Shipments", value: shipments.total, color: "text-blue-400" },
                        { label: "In Transit", value: shipments.in_transit, color: "text-amber-400" },
                        { label: "Delayed", value: shipments.delayed, color: "text-red-400" },
                        { label: "Delivered", value: shipments.delivered, color: "text-emerald-400" },
                      ].map((s) => (
                        <div key={s.label} className="bg-[#131413] border border-[#2A2C2A] rounded-xl p-4 text-center shadow-sm">
                          <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                          <div className="text-[#8A8D8A] text-xs mt-1">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Geospatial Map (SVG) */}
                  <div className="bg-[#131413] border border-[#2A2C2A] rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin size={16} className="text-emerald-500" />
                      <h3 className="font-semibold text-[#EDEFEE] text-sm">Supplier Origins Map</h3>
                    </div>
                    <div className="relative w-full h-48 bg-[#131413] rounded-xl overflow-hidden border border-[#2A2C2A]">
                      {/* Simplified World Map SVG */}
                      <svg viewBox="0 0 800 400" className="w-full h-full opacity-60">
                        <rect width="800" height="400" fill="#131413" />
                        {/* Very simplified continent outlines */}
                        <path d="M 60 80 L 200 60 L 220 150 L 160 200 L 60 180 Z" fill="#2A2C2A" />
                        <path d="M 220 60 L 400 40 L 420 180 L 300 200 L 220 150 Z" fill="#2A2C2A" />
                        <path d="M 400 40 L 560 50 L 580 200 L 440 220 L 400 180 Z" fill="#2A2C2A" />
                        <path d="M 560 50 L 700 60 L 720 180 L 600 200 L 560 150 Z" fill="#2A2C2A" />
                        <path d="M 100 200 L 200 195 L 220 320 L 140 340 L 80 300 Z" fill="#2A2C2A" />
                        <path d="M 240 200 L 380 190 L 400 340 L 300 360 L 240 320 Z" fill="#2A2C2A" />
                        <path d="M 420 300 L 540 280 L 560 380 L 460 390 L 420 360 Z" fill="#2A2C2A" />
                      </svg>

                      {/* Supplier location dots */}
                      {shipments?.shipments && [...new Map(
                        shipments.shipments.map(s => [s.vendor_country, s])
                      ).values()].map((s, i) => {
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
                            <div className={`w-3 h-3 rounded-full border-2 border-[#131413] shadow-lg ${isDelayed ? 'bg-red-500' : 'bg-emerald-400'} animate-pulse`} />
                            <span className="text-[10px] text-[#EDEFEE] font-bold mt-0.5 bg-[#131413]/90 border border-[#2A2C2A] px-1 rounded whitespace-nowrap">
                              {s.vendor_country}
                            </span>
                            <div className="absolute w-px h-8 bg-emerald-400/20 top-3 left-1/2" />
                          </div>
                        );
                      })}

                      {/* Destination — Project Site */}
                      <div className="absolute" style={{ left: "58%", top: "50%" }}>
                        <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-[#131413] shadow-lg" />
                        <span className="text-[10px] text-[#EDEFEE] font-bold bg-[#131413]/90 border border-[#2A2C2A] px-1 rounded whitespace-nowrap">Project Site</span>
                      </div>

                      <div className="absolute top-2 right-2 flex gap-3 text-[10px] text-[#8A8D8A]">
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
                      <h3 className="font-semibold text-[#EDEFEE] text-sm flex items-center gap-2">
                        <Package size={16} className="text-[#8A8D8A]" /> Shipment Tracking
                      </h3>
                      {(shipments?.shipments || []).map((s) => {
                        const tracking = s.tracking || {
                          status_index: s.status === 'delivered' ? 4 : s.status === 'in_transit' ? 2 : 0,
                          total_stages: 4,
                          is_delayed: s.risk_level === 'HIGH' || s.risk_level === 'CRITICAL'
                        };
                        const pct = ((tracking.status_index + 1) / tracking.total_stages) * 100;
                        const isDelayed = tracking.is_delayed;
                        const sev = s.risk_level === "HIGH" || s.risk_level === "CRITICAL" ? "text-red-400" : s.risk_level === "MEDIUM" ? "text-amber-400" : "text-[#8A8D8A]";
                        return (
                          <motion.div
                            key={s.po_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`bg-[#131413] border rounded-xl p-4 shadow-sm ${isDelayed ? 'border-red-900' : 'border-[#2A2C2A]'}`}
                          >
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-xs font-mono text-[#8A8D8A]">{s.po_number}</span>
                                  <span className={`text-xs font-bold ${sev}`}>{s.criticality}</span>
                                  {isDelayed && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950/30 border border-red-900 text-red-400">⚠ DELAYED {s.tracking?.delay_days || 5}d</span>}
                                </div>
                                <p className="text-[#EDEFEE] text-sm font-medium">{s.equipment_description || s.equipment_class}</p>
                                <p className="text-[#8A8D8A] text-xs mt-0.5">
                                  <MapPin size={11} className="inline animate-pulse text-[#8A8D8A]" /> {s.vendor_name} · {s.vendor_country} {s.geo?.origin_port ? `(${s.geo.origin_port})` : ''}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-[#8A8D8A]">{s.tracking?.status || s.status || "IN TRANSIT"}</div>
                                {(s.tracking?.eta || s.estimated_arrival) && <div className="text-[10px] text-[#8A8D8A]">ETA: {s.tracking?.eta || new Date(s.estimated_arrival).toLocaleDateString()}</div>}
                                {(s.tracking?.days_remaining != null) ? (
                                  <div className={`text-xs font-bold mt-0.5 ${s.tracking.days_remaining < 7 ? 'text-red-400' : s.tracking.days_remaining < 14 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {s.tracking.days_remaining < 0 ? `${Math.abs(s.tracking.days_remaining)}d overdue` : `${s.tracking.days_remaining}d left`}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            {/* Progress Bar */}
                            <div className="mt-3">
                              <div className="flex justify-between text-[10px] text-[#8A8D8A] mb-1">
                                <span>Order Confirmed</span>
                                <span>Delivered</span>
                              </div>
                              <div className="h-1.5 bg-[#181A19] rounded-full overflow-hidden">
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
                              {(s.supplier_tiers || []).map((tier) => (
                                <span key={tier.tier} className="text-[10px] px-2 py-0.5 bg-[#131413] rounded-full text-[#8A8D8A] border border-[#2A2C2A]">
                                  T{tier.tier}: {tier.name}
                                </span>
                              ))}
                            </div>
                          </motion.div>
                        );
                      })}
                      {(!shipments?.shipments || shipments.shipments.length === 0) && (
                        <div className="text-center py-12 text-[#8A8D8A] bg-[#131413] border border-[#2A2C2A] rounded-xl shadow-sm">
                          <Truck size={40} className="mx-auto mb-3 opacity-30 text-[#2A2C2A]" />
                          <p className="text-xs">No purchase orders found. Upload submittals to populate supply chain data.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Bids Tab */}
              {activeTab === "bids" && (
                <>
                {loading ? (
                  <LoadingSpinner message="Fetching vendor bids..." />
                ) : bids.length === 0 ? (
                  <div className="text-center py-16 bg-[#131413] border border-[#2A2C2A] rounded-xl shadow-sm">
                    <Landmark className="w-16 h-16 text-[#2A2C2A] mx-auto mb-4" />
                    <h3 className="text-sm font-bold text-[#EDEFEE]">No Bids Submitted Yet</h3>
                    <p className="text-[#8A8D8A] text-xs max-w-sm mx-auto mt-2 leading-relaxed">
                      Once vendors submit equipment catalogs and bidding prices for this project, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left: Bids List */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-[#EDEFEE] flex items-center gap-2">
                          <FileText size={16} className="text-emerald-500" />
                          Submitted Bids ({bids.length})
                        </h2>
                        <button 
                          onClick={fetchBidsAndRecommendations}
                          className="p-1.5 hover:bg-[#181A19] rounded-md border border-transparent hover:border-[#2A2C2A] transition-colors text-[#8A8D8A] hover:text-[#EDEFEE]"
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
                            className="bg-[#131413] border border-[#2A2C2A] p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-[#2A2C2A] transition-colors shadow-sm"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-[#EDEFEE]">Bid ID: {bid.id.slice(0, 8).toUpperCase()}</span>
                                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-emerald-950/30 text-emerald-400 border border-emerald-900 rounded-full">{bid.status}</span>
                              </div>
                              <div className="text-xl font-bold text-emerald-500">${bid.price.toLocaleString()}</div>
                              <div className="text-xs text-[#8A8D8A]">
                                Lead Time: <span className="font-semibold text-[#EDEFEE]">{bid.lead_time_days} days</span>
                              </div>
                              <div className="text-[10px] text-[#8A8D8A] max-w-md truncate">
                                Catalog: {bid.equipment_catalog_json}
                              </div>
                            </div>

                            {bid.status === 'submitted' && (
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleAction(bid.id, "accepted")}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-md text-[11px] flex items-center gap-1.5 transition-colors shadow-sm"
                                >
                                  <Check size={14} />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleAction(bid.id, "rejected")}
                                  className="bg-[#131413] hover:bg-red-950/50 text-[#8A8D8A] hover:text-red-400 border border-[#2A2C2A] hover:border-red-900 font-bold px-3 py-2 rounded-md text-[11px] flex items-center gap-1.5 transition-colors"
                                >
                                  <X size={14} />
                                  Reject
                                </button>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Right: AI Intelligence Panel */}
                    <div className="space-y-6">
                      <h2 className="text-sm font-bold text-[#EDEFEE] flex items-center gap-2">
                        <Award size={16} className="text-emerald-500" />
                        AI Recommendation
                      </h2>

                      <div className="bg-[#131413] border border-[#2A2C2A] p-5 rounded-xl space-y-6 shadow-sm">
                        {!recommendations ? (
                          <div className="text-center py-6 space-y-4">
                            <ShieldAlert className="w-10 h-10 text-[#2A2C2A] mx-auto" />
                            <p className="text-[11px] text-[#8A8D8A] leading-relaxed">
                              Instantly analyze all vendor bids on price, quality, specs, and schedule risk through Procurement Agent.
                            </p>
                            <button
                              onClick={getAIRecommendations}
                              disabled={recLoading}
                              className="w-full bg-[#181A19] hover:bg-[#2A2C2A] border border-[#2A2C2A] text-[#EDEFEE] font-bold py-2.5 rounded-md text-[11px] flex items-center justify-center gap-2 transition-all shadow-sm"
                            >
                              {recLoading ? (
                                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <BarChart3 size={14} className="text-emerald-500" />
                                  Run Agent Evaluation
                                </>
                              )}
                            </button>
                          </div>
                        ) : recommendations.length === 0 ? (
                          <p className="text-[11px] text-[#8A8D8A] text-center py-6">Evaluation yielded no definitive recommendations.</p>
                        ) : (
                          <div className="space-y-6">
                            {recommendations.map((rec, i) => (
                              <motion.div
                                key={rec.vendor_name}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="border-b border-[#2A2C2A] pb-6 last:border-b-0 last:pb-0 space-y-3"
                              >
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-xs text-[#EDEFEE]">{rec.vendor_name}</h4>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${rec.recommendation === 'RECOMMENDED' ? 'bg-emerald-950/30 border-emerald-900 text-emerald-400' : 'bg-[#131413] border-[#2A2C2A] text-[#8A8D8A]'}`}>
                                    {rec.recommendation}
                                  </span>
                                </div>

                                {/* Attribute Scores */}
                                <div className="grid grid-cols-2 gap-2 bg-[#131413] p-3 rounded-lg border border-[#2A2C2A]">
                                  <div>
                                    <div className="text-[9px] text-[#8A8D8A] font-bold uppercase">Price</div>
                                    <div className="text-xs font-extrabold text-[#EDEFEE]">{rec.price_score}/10</div>
                                  </div>
                                  <div>
                                    <div className="text-[9px] text-[#8A8D8A] font-bold uppercase">Compliance</div>
                                    <div className="text-xs font-extrabold text-[#EDEFEE]">{rec.compliance_score}/10</div>
                                  </div>
                                  <div>
                                    <div className="text-[9px] text-[#8A8D8A] font-bold uppercase">Lead Time</div>
                                    <div className="text-xs font-extrabold text-[#EDEFEE]">{rec.lead_time_score}/10</div>
                                  </div>
                                  <div>
                                    <div className="text-[9px] text-[#8A8D8A] font-bold uppercase">Quality</div>
                                    <div className="text-xs font-extrabold text-[#EDEFEE]">{rec.quality_score}/10</div>
                                  </div>
                                </div>

                                <div className="text-[11px] leading-relaxed text-[#8A8D8A]">
                                  <span className="font-bold text-[#EDEFEE]">Justification:</span> {rec.justification}
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
          </div>
        </div>

      </div>
    </div>
  );
}
