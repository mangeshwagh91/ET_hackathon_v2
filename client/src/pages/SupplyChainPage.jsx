import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, AlertTriangle, CheckCircle2, ChevronRight, Activity, Zap, Server, Package } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function SupplyChainPage() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(null);

  const fetchShipments = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/supply-chain/shipments");
      const data = await res.json();
      setShipments(data.shipments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
    const interval = setInterval(fetchShipments, 30000);
    return () => clearInterval(interval);
  }, []);

  const analyzeRisk = async (id) => {
    setAnalyzing(id);
    try {
      await fetch(`http://localhost:8000/api/supply-chain/shipments/${id}/analyze`, {
        method: "POST"
      });
      await fetchShipments();
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(null);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Activity className="animate-spin text-slate-400" /></div>;
  }

  const criticalShipments = shipments.filter(s => s.risk_level === "HIGH");

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Truck className="text-rose-500" size={32} />
            Supply Chain & Risk Visibility
          </h1>
          <p className="text-slate-500 font-medium mt-1">Live Geospatial Tracking & AI Risk Modelling</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Activity size={18} className="text-blue-500" /> Live Transit Map
            </h2>
            <div className="flex items-center gap-4 text-xs font-semibold">
               <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> On Time</span>
               <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div> Delayed / At Risk</span>
            </div>
          </div>
          <div className="flex-1 w-full bg-slate-100 z-0 relative">
            <MapContainer 
              center={[39.0438, -85.0]} 
              zoom={5} 
              style={{ height: "100%", width: "100%", zIndex: 0 }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution="&copy; OpenStreetMap contributors &copy; CARTO"
              />
              {shipments.map(s => {
                const isDelayed = s.risk_level === "HIGH" || s.risk_level === "CRITICAL";
                let color = "#10b981"; // LOW
                if (s.risk_level === "CRITICAL") color = "#be123c"; // rose-700
                else if (s.risk_level === "HIGH") color = "#f43f5e"; // rose-500
                else if (s.risk_level === "MEDIUM") color = "#f59e0b"; // amber-500
                return (
                  <React.Fragment key={s.id}>
                    {/* Route Line */}
                    <Polyline 
                      positions={[ [s.origin_lat, s.origin_lng], [s.dest_lat, s.dest_lng] ]} 
                      pathOptions={{ color: color, weight: 2, dashArray: '5, 10', opacity: 0.5 }} 
                    />
                    
                    {/* Origin Marker */}
                    <Marker position={[s.origin_lat, s.origin_lng]} opacity={0.5}>
                       <Popup>Origin</Popup>
                    </Marker>
                    
                    {/* Current Position Marker */}
                    <Marker position={[s.current_lat, s.current_lng]}>
                      <Popup>
                        <div className="font-bold text-sm">{s.carrier_name}</div>
                        <div className="text-xs text-slate-500 mt-1">Status: {s.status.toUpperCase()}</div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* AI Analysis Sidebar */}
        <div className="space-y-4 overflow-y-auto pr-2 max-h-[500px]">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-2">Active Shipments</h3>
          
          <AnimatePresence>
            {shipments.map((s) => (
              <motion.div 
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-xl border p-4 shadow-sm relative overflow-hidden ${
                  s.risk_level === "CRITICAL" ? "border-rose-300" :
                  s.risk_level === "HIGH" ? "border-rose-200" : 
                  s.risk_level === "MEDIUM" ? "border-amber-200" : "border-slate-200"
                }`}
              >
                {s.risk_level === "CRITICAL" && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-700" />
                )}
                {s.risk_level === "HIGH" && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                )}
                {s.risk_level === "MEDIUM" && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                )}
                {s.risk_level === "LOW" && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                )}

                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                       <Package size={12} /> {s.carrier_name}
                    </div>
                    <div className="font-bold text-slate-800">{s.tracking_number}</div>
                  </div>
                  {s.risk_level === "CRITICAL" ? (
                    <span className="px-2 py-1 rounded bg-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1">
                      <AlertTriangle size={12} /> CRITICAL
                    </span>
                  ) : s.risk_level === "HIGH" ? (
                    <span className="px-2 py-1 rounded bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1">
                      <AlertTriangle size={12} /> HIGH RISK
                    </span>
                  ) : s.risk_level === "MEDIUM" ? (
                    <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold flex items-center gap-1">
                      <AlertTriangle size={12} /> MEDIUM
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> ON TRACK
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Est. Arrival:</span>
                    <span className="text-slate-900">{new Date(s.estimated_arrival).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Required By:</span>
                    <span className={s.risk_level === "HIGH" ? "text-rose-600 font-bold" : "text-slate-900"}>
                      {new Date(s.required_delivery).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {(s.risk_level === "HIGH" || s.risk_level === "CRITICAL") && (
                  <div className="border-t border-rose-100 pt-3 mt-2">
                    {!s.ai_alternatives || !s.ai_alternatives.alternatives || s.ai_alternatives.alternatives.length === 0 ? (
                      <button
                        onClick={() => analyzeRisk(s.id)}
                        disabled={analyzing === s.id}
                        className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {analyzing === s.id ? (
                          <><Activity size={14} className="animate-spin" /> Analyzing Risk...</>
                        ) : (
                          <><Zap size={14} /> Run AI Risk Model</>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-xs text-rose-800 bg-rose-50 p-2 rounded-lg leading-relaxed">
                          <span className="font-bold block mb-1">AI Assessment:</span>
                          {s.ai_alternatives.risk_assessment}
                        </div>
                        
                        <div className="space-y-2">
                           <span className="text-[10px] uppercase font-bold text-slate-400">Procurement Alternatives</span>
                           {s.ai_alternatives.alternatives && s.ai_alternatives.alternatives.map((alt, i) => (
                             <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col gap-1">
                                <div className="text-xs font-bold text-slate-800">{alt.action}</div>
                                <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                                   <span>Impact: <span className="text-amber-600">{alt.estimated_cost_impact}</span></span>
                                   <span>Saves: <span className="text-emerald-600">{alt.time_saved_days} days</span></span>
                                </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
