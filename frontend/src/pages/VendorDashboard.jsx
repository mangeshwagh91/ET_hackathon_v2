import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Landmark, ArrowRight, Zap, RefreshCw, Send, DollarSign, Calendar, Info } from "lucide-react";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

export default function VendorDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  
  // Bid Form States
  const [price, setPrice] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [catalogDescription, setCatalogDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchOpenProjects();
  }, []);

  const fetchOpenProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOpenProjects();
      setProjects(data);
    } catch (err) {
      setError(err.message || "Failed to load open projects");
    } finally {
      setLoading(false);
    }
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    if (!price || !leadTime || !catalogDescription) {
      setError("Please fill out all fields");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    try {
      const bidData = {
        project_id: selectedProject.id,
        vendor_id: user.id,
        price: parseFloat(price),
        lead_time_days: parseInt(leadTime),
        equipment_catalog_json: JSON.stringify({ description: catalogDescription }),
      };
      
      await api.createBid(bidData);
      setSuccessMsg("Bid submitted successfully!");
      setPrice("");
      setLeadTime("");
      setCatalogDescription("");
      setTimeout(() => {
        setSuccessMsg("");
        setSelectedProject(null);
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 text-slate-800 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Open Data Centre Opportunities</h1>
          <p className="text-slate-500 text-sm mt-1">Review active project specifications and submit competitive bids.</p>
        </div>
        <button 
          onClick={fetchOpenProjects} 
          className="btn-secondary self-start md:self-auto flex items-center gap-2"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-red-50 border border-red-200 text-red-655 rounded-xl mb-6 text-xs font-semibold"
        >
          {error}
        </motion.div>
      )}

      {successMsg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-xl mb-6 text-xs font-semibold"
        >
          {successMsg}
        </motion.div>
      )}

      {loading ? (
        <LoadingSpinner message="Scanning network for active projects..." />
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Landmark className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-800 font-bold text-sm">No Open Projects</h3>
          <p className="text-slate-500 text-xs mt-1">Check back later for active requests for proposals (RFPs).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Projects List */}
          <div className="lg:col-span-2 space-y-4">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ borderColor: "rgba(16, 185, 129, 0.6)" }}
                className={`bg-white border rounded-2xl p-6 transition-all cursor-pointer shadow-sm ${selectedProject?.id === project.id ? 'border-emerald-500 shadow-md' : 'border-slate-200'}`}
                onClick={() => { setSelectedProject(project); setError(""); setSuccessMsg(""); }}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      {project.name}
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-650 border border-emerald-200 rounded-full">Open</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                      <div>Capacity: <span className="font-semibold text-slate-850">{project.size_mw} MW</span></div>
                      <div>Deadline: <span className="font-semibold text-slate-850">{project.deadline}</span></div>
                      <div>Target Budget: <span className="font-semibold text-slate-850">${project.budget.toLocaleString()}</span></div>
                    </div>
                  </div>
                  <button className="text-emerald-650 text-xs font-bold flex items-center gap-1 group">
                    <span>Submit Proposal</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Proposal Sidepanel */}
          <div>
            <AnimatePresence mode="wait">
              {selectedProject ? (
                <motion.div
                  key="proposal-panel"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm"
                >
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Proposal Formulation</h2>
                    <p className="text-xs text-slate-500 mt-1">Formulating bid for: <span className="font-bold text-emerald-600">{selectedProject.name}</span></p>
                  </div>

                  <form onSubmit={handleBidSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <DollarSign size={10} /> Bid Price (USD)
                      </label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="e.g. 1500000"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-850 focus:outline-none focus:border-emerald-500 transition-colors placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Calendar size={10} /> Lead Time (Days)
                      </label>
                      <input
                        type="number"
                        value={leadTime}
                        onChange={(e) => setLeadTime(e.target.value)}
                        placeholder="e.g. 45"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-850 focus:outline-none focus:border-emerald-500 transition-colors placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Info size={10} /> Equipment Catalog Description
                      </label>
                      <textarea
                        value={catalogDescription}
                        onChange={(e) => setCatalogDescription(e.target.value)}
                        placeholder="Detail performance specifications, rated capacity, voltages, and configuration details..."
                        rows={5}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-850 focus:outline-none focus:border-emerald-500 transition-colors placeholder-slate-400 resize-none"
                      />
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-emerald-500/10"
                    >
                      {submitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={14} className="text-white" />
                          <span>Transmit Proposal</span>
                        </>
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl text-center space-y-3 shadow-sm">
                  <Info className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Select any project from the open opportunities panel to formulate and transmit your equipment proposal.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>
      )}
    </div>
  );
}
