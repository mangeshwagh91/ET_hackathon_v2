import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Plus, Play, Pause, MoreVertical, LayoutGrid, List, MapPin, Cpu, Building, DollarSign, ShieldCheck, ArrowRight, Zap } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import api from "../api/client.js";

export default function ProjectsPage() {
  const { projects, fetchProjects, setCurrentProject, loadingProjects } = useWorkspace();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [isGridView, setIsGridView] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchProjects();
    api.getDashboardSummary()
      .then(setSummary)
      .catch((err) => console.error("Error loading summary:", err));
  }, []);

  const handleToggleStatus = async (e, project) => {
    e.stopPropagation();
    const nextStatus = project.status === "paused" ? "active" : "paused";
    try {
      await api.updateProjectStatus(project.id, nextStatus);
      fetchProjects();
    } catch (err) {
      console.error("Failed to update project status:", err);
    }
  };


  const filteredProjects = projects
    .filter((project) => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "newest") {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      return 0;
    });

  const handleProjectSelect = (project) => {
    setCurrentProject(project);
    navigate("/dashboard");
  };


  // Portfolio metrics
  const totalCapacity = projects.reduce((sum, p) => sum + (Number(p.size_mw) || 0), 0);
  const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const activeProjectsCount = projects.filter(p => p.status === "active").length;
  const healthScore = summary?.project_health_score || 94;

  return (
    <div className="space-y-8 relative min-h-screen text-slate-800 pb-16">
      


      {/* ─── Toolbar: Search, Filters & Views ─── */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white border border-slate-200/80 p-3 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex flex-1 w-full gap-2 items-center flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all placeholder-slate-400"
            />
          </div>

          {/* Status Selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="name">Sort by: Name</option>
            <option value="newest">Sort by: Newest</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0">
          {/* View toggles */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center shrink-0">
            <button
              onClick={() => setIsGridView(true)}
              className={`p-1.5 rounded-lg transition-colors ${isGridView ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setIsGridView(false)}
              className={`p-1.5 rounded-lg transition-colors ${!isGridView ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              <List size={16} />
            </button>
          </div>

          {/* Create Project Button */}
          <button
            onClick={() => navigate("/projects/new")}
            className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-teal-500/10 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={16} /> New project
          </button>
        </div>
      </div>

      {/* ─── Project Grid / List ─── */}
      {loadingProjects ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Fetching workspace portfolio...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <p className="text-slate-500 font-medium">No projects match your filter criteria.</p>
          <button
            onClick={() => navigate("/projects/new")}
            className="mt-4 text-teal-600 font-bold hover:underline"
          >
            Initialize a new project
          </button>
        </div>
      ) : isGridView ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProjects.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
              whileHover={{ y: -4, boxShadow: "0 12px 30px rgba(0,0,0,0.04)" }}
              onClick={() => handleProjectSelect(project)}
              className="bg-white border border-slate-250/80 rounded-2xl p-6 hover:border-teal-500/40 transition-all cursor-pointer flex flex-col justify-between h-[210px] group relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.015)]"
            >
              {/* Dynamic decorative backdrop line representing project health gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-500" />
              
              <div>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-teal-600 transition-colors leading-tight">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
                      <MapPin size={11} className="text-slate-400 shrink-0" />
                      <span>{project.location || "AWS | us-east-1"}</span>
                    </div>
                  </div>
                  
                  {/* Subtle actions dropdown button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shrink-0"
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>

                {/* Micro-badges for size & budget */}
                <div className="flex items-center gap-2 mt-4">
                  {project.size_mw && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                      <Cpu size={12} className="text-teal-500" />
                      {project.size_mw} MW
                    </span>
                  )}
                  {project.budget && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                      <DollarSign size={12} className="text-indigo-500" />
                      ${project.budget}M
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer: Status control + Select CTA */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                <div 
                  onClick={(e) => handleToggleStatus(e, project)}
                  className="flex items-center gap-2 group/status hover:text-teal-600 transition-colors"
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                    project.status === "paused" 
                      ? "bg-slate-100 text-slate-500 hover:bg-slate-200" 
                      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  }`}>
                    {project.status === "paused" ? <Pause size={10} /> : <Play size={10} />}
                  </div>
                  <span className="text-xs font-semibold text-slate-500 capitalize transition-colors">
                    {project.status || "paused"}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-teal-600 group-hover:translate-x-1.5 transition-transform">
                  Enter
                  <ArrowRight size={13} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3.5">Project Name</th>
                <th className="px-6 py-3.5">Region / Location</th>
                <th className="px-6 py-3.5">IT Load (MW)</th>
                <th className="px-6 py-3.5">Budget</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className="hover:bg-slate-50/50 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <span className="font-extrabold text-slate-900 group-hover:text-teal-600 transition-colors">
                      {project.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">
                    {project.location || "AWS | us-east-1"}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-700">
                    {project.size_mw ? `${project.size_mw} MW` : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-700">
                    {project.budget ? `$${project.budget}M` : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={(e) => handleToggleStatus(e, project)}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full hover:scale-105 transition-transform ${project.status === 'paused' ? 'bg-slate-100 text-slate-650' : 'bg-emerald-50 text-emerald-700'}`}
                    >
                      {project.status === "paused" ? <Pause size={10} /> : <Play size={10} />}
                      {project.status || "paused"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-655 transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
