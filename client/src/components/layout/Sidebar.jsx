import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  FileText,
  HelpCircle,
  AlertCircle,
  ActivitySquare,
  Wrench,
  Landmark,
  BrainCircuit,
  ShieldCheck,
  Clock,
  Package,
  Activity,
  ChevronDown,
  Building,
  Users,
  LayoutGrid,
  CreditCard,
  Settings,
  Plus,
  Truck,
  Cpu
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const { user } = useAuth();
  const { currentProject, projects, setCurrentProject } = useWorkspace();
  const isTeam = user?.type === "team";
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const isGlobalPage = location.pathname === "/projects";

  const globalGroups = [
    {
      label: "Organization",
      icon: <Building size={13} className="text-emerald-500" />,
      links: [
        { name: "Projects", path: "/projects", icon: <LayoutGrid size={15} /> },
        { name: "Team", path: "#", icon: <Users size={15} /> },
        { name: "Integrations", path: "/integrations", icon: <Package size={15} /> },
        { name: "Usage", path: "#", icon: <Activity size={15} /> },
        { name: "Billing", path: "#", icon: <CreditCard size={15} /> },
        { name: "Settings", path: "#", icon: <Settings size={15} /> },
      ],
    },
  ];

  const teamGroups = [
    {
      label: "Orchestrator",
      icon: <BrainCircuit size={13} className="text-emerald-500" />,
      links: [
        { name: "Orchestrator Space", path: "/orchestrator", icon: <Cpu size={15} /> },
        { name: "Dashboard", path: "/dashboard", icon: <BarChart3 size={15} /> },
        { name: "Activity Log", path: "/activity", icon: <Activity size={15} /> },
      ],
    },
    {
      label: "Knowledge Base",
      icon: <FileText size={13} className="text-blue-500" />,
      links: [
        { name: "Documents & Specs", path: "/documents", icon: <FileText size={15} /> },
        { name: "RFI Copilot", path: "/rfi", icon: <HelpCircle size={15} /> },
      ],
    },
    {
      label: "Quality Control",
      icon: <ShieldCheck size={13} className="text-purple-500" />,
      links: [
        { name: "Compliance & NCRs", path: "/compliance", icon: <AlertCircle size={15} /> },
      ],
    },
    {
      label: "Project Delivery",
      icon: <Clock size={13} className="text-amber-500" />,
      links: [
        { name: "Schedule Risk", path: "/schedule", icon: <ActivitySquare size={15} /> },
        { name: "Commissioning", path: "/commissioning", icon: <Wrench size={15} /> },
      ],
    },
    {
      label: "Supply Chain",
      icon: <Package size={13} className="text-rose-500" />,
      links: [
        { name: "Bids & Contracts", path: "/bids", icon: <Landmark size={15} /> },
        { name: "Shipment Tracker", path: "/supply-chain", icon: <Truck size={15} /> },
      ],
    },
  ];

  const vendorGroups = [
    {
      label: "Vendor Portal",
      icon: <Package size={13} className="text-emerald-500" />,
      links: [
        { name: "Open Projects", path: "/", icon: <BarChart3 size={15} /> },
        { name: "My Bids", path: "/vendor/bids", icon: <Landmark size={15} /> },
        { name: "Vendor Profile", path: "/vendor/profile", icon: <FileText size={15} /> },
      ],
    },
  ];

  const groups = isGlobalPage ? globalGroups : isTeam ? teamGroups : vendorGroups;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 z-50 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-5 border-b border-slate-200 shrink-0">
          <Link
            to={isTeam ? "/projects" : "/"}
            className="flex items-center gap-2.5 group"
            onClick={() => setIsOpen(false)}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-[11px] tracking-tight">DF</span>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-slate-900 text-base tracking-tight leading-none">DataForge AI</span>
              <span className="text-[10px] text-slate-400 font-medium">Platform</span>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-5 px-3">
          <div className="space-y-2">
            {groups.map((group, idx) => (
              <div key={idx}>

                <div className="space-y-0.5">
                  {group.links.map((link) => {
                    const isActive = location.pathname === link.path;
                    return (
                      <Link
                        key={link.name}
                        to={link.path}
                        onClick={() => setIsOpen(false)}
                        className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="sidebarActive"
                            className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-full"
                            initial={false}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          />
                        )}
                        <span
                          className={`transition-colors ${
                            isActive
                              ? "text-emerald-500"
                              : "text-slate-400 group-hover:text-slate-600"
                          }`}
                        >
                          {link.icon}
                        </span>
                        <span>{link.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project switcher */}
        {!isGlobalPage && isTeam && (
          <div className="p-3 border-t border-slate-200 shrink-0 relative">
            {workspaceOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 bg-slate-50">
                  Switch Project
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setCurrentProject(p); setWorkspaceOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${
                        p.id === currentProject?.id
                          ? "text-emerald-600 bg-emerald-50"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Building size={13} className={p.id === currentProject?.id ? "text-emerald-500" : "text-slate-400"} />
                      <span className="truncate">{p.name}</span>
                      {p.id === currentProject?.id && (
                        <span className="ml-auto w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100">
                  <Link
                    to="/projects"
                    onClick={() => setWorkspaceOpen(false)}
                    className="block px-3 py-2.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    ← All Projects
                  </Link>
                  <Link
                    to="/projects/new"
                    onClick={() => setWorkspaceOpen(false)}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors border-t border-slate-100"
                  >
                    <Plus size={13} /> New Project
                  </Link>
                </div>
              </div>
            )}

            <button
              onClick={() => setWorkspaceOpen(!workspaceOpen)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 rounded-xl p-3 flex items-center gap-2.5 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                <Building size={13} className="text-emerald-600" />
              </div>
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Project</span>
                <span className="text-sm font-semibold text-slate-700 truncate w-full text-left">
                  {currentProject?.name ?? "Select Project"}
                </span>
              </div>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform shrink-0 ${workspaceOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
