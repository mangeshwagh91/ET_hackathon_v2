import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Plus, LayoutGrid, List, MoreVertical, Play, Pause } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import api from "../api/client.js";

export default function ProjectsPage() {
  const { projects, fetchProjects, setCurrentProject, loadingProjects } = useWorkspace();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [isGridView, setIsGridView] = useState(true);

  useEffect(() => {
    fetchProjects();
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

  return (
    <div className="flex flex-col min-h-screen bg-[#131413] text-white">
      <div className="flex-1 p-10 max-w-6xl mx-auto w-full pt-16">
        <h1 className="text-[22px] font-bold tracking-tight mb-8">Projects</h1>

      {/* ─── Toolbar: Search, Filters & Views ─── */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <div className="flex flex-1 w-full gap-3 items-center flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8D8A]" size={15} />
            <input
              type="text"
              placeholder="Search for a project"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#131413] border border-[#2A2C2A] rounded-md pl-9 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-[#8A8D8A] transition-all placeholder:text-[#8A8D8A]"
            />
          </div>

          {/* Status Selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#131413] border border-[#2A2C2A] rounded-md px-3 py-1.5 text-sm font-medium text-[#8A8D8A] focus:outline-none focus:border-[#8A8D8A] cursor-pointer"
          >
            <option value="all">Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#131413] border border-[#2A2C2A] rounded-md px-3 py-1.5 text-sm font-medium text-[#8A8D8A] focus:outline-none focus:border-[#8A8D8A] cursor-pointer"
          >
            <option value="name">Sorted by name</option>
            <option value="newest">Sorted by newest</option>
          </select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* View toggles */}
          <div className="bg-[#131413] border border-[#2A2C2A] p-0.5 rounded-md flex items-center shrink-0">
            <button
              onClick={() => setIsGridView(true)}
              className={`p-1.5 rounded-[4px] transition-colors ${isGridView ? "bg-[#2A2C2A] text-white" : "text-[#8A8D8A] hover:text-[#EDEFEE]"}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setIsGridView(false)}
              className={`p-1.5 rounded-[4px] transition-colors ${!isGridView ? "bg-[#2A2C2A] text-white" : "text-[#8A8D8A] hover:text-[#EDEFEE]"}`}
            >
              <List size={14} />
            </button>
          </div>

          {/* Create Project Button */}
          <button
            onClick={() => navigate("/projects/new")}
            className="bg-[#00e59b] hover:bg-[#00c585] text-black px-4 py-1.5 rounded-md text-[13px] font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={14} className="stroke-[3px]" /> New project
          </button>
        </div>
      </div>

      {/* ─── Project Grid ─── */}
      {loadingProjects ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#8A8D8A]">
          <div className="w-8 h-8 border-4 border-[#00e59b] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="border border-[#2A2C2A] rounded-xl p-12 text-center">
          <p className="text-[#8A8D8A] text-sm">No projects found.</p>
        </div>
      ) : isGridView ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
              onClick={() => handleProjectSelect(project)}
              className="bg-[#131413] border border-[#2A2C2A] rounded-xl p-5 hover:border-[#8A8D8A] transition-colors cursor-pointer flex flex-col justify-between h-[160px] group"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-semibold text-white text-base leading-tight">
                    {project.name}
                  </h3>
                  <div className="text-[13px] text-[#8A8D8A] font-mono">
                    {project.location || "AWS | ap-southeast-1"}
                  </div>
                </div>
                
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="p-1 rounded-md text-[#8A8D8A] hover:text-white transition-colors"
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              <div className="mt-3">
                 <span className="inline-flex items-center text-[10px] font-bold text-[#8A8D8A] bg-[#2A2C2A] rounded px-1.5 py-0.5 uppercase tracking-wider">
                    {project.size_mw ? `${project.size_mw} MW` : "NANO"}
                 </span>
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#2A2C2A]">
                <div 
                  onClick={(e) => handleToggleStatus(e, project)}
                  className="flex items-center gap-2 group/status text-[#8A8D8A] hover:text-white transition-colors"
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center border border-[#2A2C2A] transition-colors ${
                    project.status === "paused" 
                      ? "bg-transparent text-[#8A8D8A]" 
                      : "bg-[#00e59b] text-black border-[#00e59b]"
                  }`}>
                    {project.status === "paused" ? <Pause size={8} className="fill-current" /> : <Play size={8} className="fill-current" />}
                  </div>
                  <span className="text-[13px]">
                    Project is {project.status || "paused"}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="border border-[#2A2C2A] rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#131413] border-b border-[#2A2C2A] text-[13px] text-[#8A8D8A]">
                <th className="px-6 py-3 font-normal">Project Name</th>
                <th className="px-6 py-3 font-normal">Region</th>
                <th className="px-6 py-3 font-normal">Status</th>
                <th className="px-6 py-3 font-normal"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2C2A]">
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className="hover:bg-[#181A19] cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <span className="font-semibold text-white">
                      {project.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-mono text-[#8A8D8A]">
                    {project.location || "AWS | ap-southeast-1"}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={(e) => handleToggleStatus(e, project)}
                      className="inline-flex items-center gap-2 text-[13px] text-[#8A8D8A] hover:text-white"
                    >
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center border border-[#2A2C2A] ${
                        project.status === "paused" ? "bg-transparent" : "bg-[#00e59b] text-black border-[#00e59b]"
                      }`}>
                         {project.status === "paused" ? <Pause size={8} /> : <Play size={8} />}
                      </div>
                      Project is {project.status || "paused"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className="p-1 rounded-md text-[#8A8D8A] hover:text-white transition-colors"
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
    </div>
  );
}
