import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Truck, AlertTriangle, MapPin, Clock, ChevronRight,
  ShieldAlert, CheckCircle, Circle, ArrowRight, Globe, Layers,
  Filter, RefreshCw, Box, Anchor
} from "lucide-react";
import api from "../api/client.js";

const STATUS_COLORS = {
  "Order Confirmed": "bg-slate-400",
  "In Production": "bg-blue-500",
  "Factory Acceptance Test": "bg-indigo-500",
  "Ready to Ship": "bg-violet-500",
  "In Transit": "bg-amber-500",
  "At Port (Origin)": "bg-orange-500",
  "Customs Cleared": "bg-teal-500",
  "At Port (Destination)": "bg-cyan-500",
  "Last Mile Delivery": "bg-emerald-500",
  "Delivered": "bg-green-600",
};

const SEVERITY_STYLES = {
  CRITICAL: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700" },
  MAJOR: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
  MINOR: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
};

export default function SupplyChainPage() {
  const [shipments, setShipments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [mapData, setMapData] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [shipmentsData, alertsData, mapRes] = await Promise.all([
        api.getSupplyChainShipments(),
        api.getSupplyChainAlerts(),
        api.getSupplyChainMap(),
      ]);
      setShipments(shipmentsData.shipments || []);
      setStats({
        total: shipmentsData.total || 0,
        delayed: shipmentsData.delayed || 0,
        inTransit: shipmentsData.in_transit || 0,
        delivered: shipmentsData.delivered || 0,
        onTime: shipmentsData.on_time || 0,
      });
      setAlerts(alertsData.alerts || []);
      setMapData(mapRes);
    } catch (err) {
      console.error("Supply chain data error:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredShipments = shipments.filter(s => {
    if (filterStatus !== "all" && s.tracking.status !== filterStatus) return false;
    if (filterRisk === "delayed" && !s.tracking.is_delayed) return false;
    if (filterRisk === "on-time" && s.tracking.is_delayed) return false;
    return true;
  });

  const uniqueStatuses = [...new Set(shipments.map(s => s.tracking.status))];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400 space-y-3">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Loading supply chain data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Globe size={22} className="text-teal-500" />
            Supply Chain Visibility
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Track critical equipment shipments across multi-tier suppliers
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ─── KPI Strip ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Shipments", value: stats.total, icon: <Package size={18} className="text-slate-500" />, color: "bg-slate-50" },
          { label: "In Transit", value: stats.inTransit, icon: <Truck size={18} className="text-amber-500" />, color: "bg-amber-50" },
          { label: "Delivered", value: stats.delivered, icon: <CheckCircle size={18} className="text-emerald-500" />, color: "bg-emerald-50" },
          { label: "On Time", value: stats.onTime, icon: <Clock size={18} className="text-teal-500" />, color: "bg-teal-50" },
          { label: "Delayed / At Risk", value: stats.delayed, icon: <AlertTriangle size={18} className="text-red-500" />, color: "bg-red-50" },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-3"
          >
            <div className={`w-9 h-9 rounded-xl ${kpi.color} flex items-center justify-center shrink-0`}>
              {kpi.icon}
            </div>
            <div>
              <div className="text-xl font-black text-slate-800">{kpi.value}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        {/* ─── Left: Shipments Table ─── */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Filter size={12} /> Filters
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Stages</option>
              {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Risk</option>
              <option value="delayed">Delayed Only</option>
              <option value="on-time">On Time Only</option>
            </select>
            <span className="ml-auto text-xs font-semibold text-slate-400">
              {filteredShipments.length} shipments
            </span>
          </div>

          {/* Shipment Cards */}
          <div className="space-y-3">
            {filteredShipments.map((s, idx) => {
              const isDelayed = s.tracking.is_delayed;
              const isSelected = selectedShipment?.po_id === s.po_id;
              const progressPct = Math.round((s.tracking.status_index / (s.tracking.total_stages - 1)) * 100);

              return (
                <motion.div
                  key={s.po_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => setSelectedShipment(isSelected ? null : s)}
                  className={`bg-white border rounded-2xl p-4 cursor-pointer transition-all hover:shadow-sm ${
                    isSelected ? "border-teal-400 shadow-md ring-1 ring-teal-100" : isDelayed ? "border-red-200" : "border-slate-200/80"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold font-mono text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">
                          {s.po_number}
                        </span>
                        {isDelayed && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle size={10} /> {s.tracking.delay_days}d late
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.criticality === "HIGH" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"
                        }`}>
                          {s.criticality}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 truncate">{s.equipment_description}</h3>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1"><Box size={11} /> {s.vendor_name}</span>
                        <span className="flex items-center gap-1"><MapPin size={11} /> {s.vendor_country}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white ${STATUS_COLORS[s.tracking.status] || "bg-slate-400"}`}>
                        {s.tracking.status}
                      </div>
                      {s.tracking.eta && (
                        <div className="text-[10px] text-slate-400 font-medium mt-1">
                          ETA: {s.tracking.eta.slice(0, 10)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.05 }}
                      className={`h-full rounded-full ${isDelayed ? "bg-red-400" : "bg-teal-500"}`}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-semibold text-slate-400 mt-1">
                    <span>Order Placed</span>
                    <span>{progressPct}%</span>
                    <span>Delivered</span>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                          {/* Supplier Tiers */}
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                              <Layers size={11} /> Multi-Tier Supplier Chain
                            </h4>
                            <div className="flex items-center gap-2">
                              {s.supplier_tiers?.map((tier, ti) => (
                                <div key={ti} className="flex items-center gap-2">
                                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center min-w-[120px]">
                                    <div className="text-[9px] font-bold text-teal-600 uppercase">Tier {tier.tier}</div>
                                    <div className="text-[11px] font-bold text-slate-700 truncate">{tier.name}</div>
                                    <div className="text-[9px] text-slate-400">{tier.role}</div>
                                  </div>
                                  {ti < s.supplier_tiers.length - 1 && (
                                    <ArrowRight size={14} className="text-slate-300 shrink-0" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Geo info */}
                          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Anchor size={12} className="text-indigo-500" />
                              Origin: {s.geo?.origin_port}
                            </span>
                            <ArrowRight size={12} className="text-slate-300" />
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-teal-500" />
                              {s.geo?.destination}
                            </span>
                          </div>

                          {s.tracking.days_remaining != null && (
                            <div className={`text-xs font-bold ${s.tracking.days_remaining < 0 ? "text-red-600" : s.tracking.days_remaining < 14 ? "text-amber-600" : "text-emerald-600"}`}>
                              {s.tracking.days_remaining < 0 
                                ? `⚠️ Overdue by ${Math.abs(s.tracking.days_remaining)} days`
                                : `${s.tracking.days_remaining} days until required delivery`
                              }
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ─── Right: Alerts + Geo Summary ─── */}
        <div className="space-y-4">
          {/* Alerts Panel */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-sm">
              <ShieldAlert size={16} className="text-red-500" />
              Delivery Alerts
              {alerts.length > 0 && (
                <span className="ml-auto text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  {alerts.length} active
                </span>
              )}
            </h3>

            {alerts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <CheckCircle size={24} className="mx-auto mb-2 text-emerald-400" />
                No active delivery alerts
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {alerts.map((alert, i) => {
                  const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.MINOR;
                  return (
                    <div key={i} className={`${style.bg} border ${style.border} rounded-xl p-3`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                          {alert.severity}
                        </span>
                        <span className={`text-xs font-black ${alert.days_remaining < 0 ? "text-red-600" : "text-amber-600"}`}>
                          {alert.days_remaining < 0 ? `${Math.abs(alert.days_remaining)}d overdue` : `${alert.days_remaining}d left`}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700 leading-relaxed">{alert.message}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Supplier Origins */}
          {mapData && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-sm">
                <Globe size={16} className="text-indigo-500" />
                Supplier Origins
              </h3>

              <div className="space-y-2">
                {mapData.supplier_locations?.map((loc, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 rounded-xl p-3 hover:bg-slate-100/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                      <MapPin size={14} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-700 truncate">{loc.vendor}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{loc.country} • {loc.port}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-700">{loc.po_count} POs</div>
                      {loc.critical_items > 0 && (
                        <div className="text-[10px] font-bold text-red-500">{loc.critical_items} critical</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {mapData.destination && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                  <MapPin size={12} className="text-teal-500" />
                  Destination: {mapData.destination.city}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
