import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Landmark, RefreshCw, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

export default function VendorBids() {
  const { user } = useAuth();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyBids();
  }, []);

  const fetchMyBids = async () => {
    setLoading(true);
    setError(null);
    try {
      const openProjects = await api.getOpenProjects();
      const allBidsPromise = openProjects.map(async (project) => {
        try {
          const projectBids = await api.getBids(project.id);
          // Filter bids submitted by this specific vendor and add project name context
          return projectBids
            .filter(b => b.vendor_id === user.id)
            .map(b => ({ ...b, projectName: project.name }));
        } catch (_) {
          return [];
        }
      });

      const resolvedBids = await Promise.all(allBidsPromise);
      setBids(resolvedBids.flat());
    } catch (err) {
      setError(err.message || "Failed to load submitted proposals");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 text-slate-800 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">My Proposals & Bids</h1>
          <p className="text-slate-500 text-sm mt-1">Monitor the compliance checking and evaluation status of your proposals.</p>
        </div>
        <button 
          onClick={fetchMyBids} 
          className="btn-secondary self-start md:self-auto flex items-center gap-2"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-650 rounded-xl mb-6 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Querying transaction log for submitted bids..." />
      ) : bids.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Landmark className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-800 font-bold text-sm">No Active Proposals</h3>
          <p className="text-slate-500 text-xs mt-1">Formulate bids on the Project Hub to view status tracking here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bids.map((bid) => {
            const isAccepted = bid.status === "accepted";
            const isSubmitted = bid.status === "submitted";

            return (
              <motion.div
                key={bid.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-350 transition-colors shadow-sm"
              >
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-450 uppercase tracking-wider">
                    Project: <span className="text-slate-800 font-bold">{bid.projectName}</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">${bid.price.toLocaleString()}</div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                    <div>Lead Time: <span className="font-semibold text-slate-850">{bid.lead_time_days} days</span></div>
                    <div>Bid ID: <span className="font-semibold text-slate-400">{bid.id.slice(0, 8).toUpperCase()}</span></div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border flex items-center gap-1.5 ${
                    isAccepted 
                      ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
                      : isSubmitted 
                      ? 'bg-blue-50 border-blue-200 text-blue-650'
                      : 'bg-slate-50 border-slate-250 text-slate-500'
                  }`}>
                    {isAccepted ? <CheckCircle2 size={12} /> : isSubmitted ? <Clock size={12} /> : <AlertCircle size={12} />}
                    {bid.status}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
