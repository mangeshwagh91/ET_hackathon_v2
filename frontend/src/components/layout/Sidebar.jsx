import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  Building
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const { user } = useAuth();
  const isTeam = user?.type === "team";
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const teamGroups = [
    {
      agent: "Orchestrator",
      icon: <BrainCircuit size={16} className="text-emerald-400" />,
      links: [
        { name: "Dashboard", path: "/", icon: <BarChart3 size={16} /> },
        { name: "Activity Log", path: "/activity", icon: <Activity size={16} /> }
      ]
    },
    {
      agent: "Knowledge Base",
      icon: <FileText size={16} className="text-blue-400" />,
      links: [
        { name: "Documents & Specs", path: "/documents", icon: <FileText size={16} /> },
        { name: "RFI Copilot", path: "/rfi", icon: <HelpCircle size={16} /> }
      ]
    },
    {
      agent: "Quality Control",
      icon: <ShieldCheck size={16} className="text-purple-400" />,
      links: [
        { name: "Compliance & NCRs", path: "/compliance", icon: <AlertCircle size={16} /> }
      ]
    },
    {
      agent: "Project Delivery",
      icon: <Clock size={16} className="text-amber-400" />,
      links: [
        { name: "Schedule Risk", path: "/schedule", icon: <ActivitySquare size={16} /> },
        { name: "Commissioning", path: "/commissioning", icon: <Wrench size={16} /> }
      ]
    },
    {
      agent: "Supply Chain",
      icon: <Package size={16} className="text-rose-400" />,
      links: [
        { name: "Bids & Contracts", path: "/bids", icon: <Landmark size={16} /> }
      ]
    }
  ];

  const vendorGroups = [
    {
      agent: "Vendor Portal",
      icon: <Package size={16} className="text-emerald-400" />,
      links: [
        { name: "Open Projects", path: "/", icon: <BarChart3 size={16} /> },
        { name: "My Bids", path: "/vendor/bids", icon: <Landmark size={16} /> },
        { name: "Vendor Profile", path: "/vendor/profile", icon: <FileText size={16} /> }
      ]
    }
  ];

  const groups = isTeam ? teamGroups : vendorGroups;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen bg-white border-r border-slate-200 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-64 flex flex-col`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 shrink-0">
          <Link to="/" className="flex items-center gap-3 group" onClick={() => setIsOpen(false)}>
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/10 group-hover:scale-105 transition-transform">
              <span className="text-white font-extrabold text-xs tracking-tighter">DC</span>
            </div>
            <span className="font-extrabold text-slate-800 tracking-tight text-lg">
              DCPI
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
          <div className="space-y-8">
            {groups.map((group, idx) => (
              <div key={idx} className="space-y-2">
                <div className="px-3 flex items-center gap-2 mb-2">
                  {group.icon}
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {group.agent}
                  </h3>
                </div>
                
                <div className="space-y-1">
                  {group.links.map((link) => {
                    const isActive = location.pathname === link.path;
                    return (
                      <Link
                        key={link.name}
                        to={link.path}
                        onClick={() => setIsOpen(false)}
                        className={`relative flex items-center gap-3 px-3 py-2 rounded-xl transition-colors group ${
                          isActive 
                            ? 'bg-slate-100 text-slate-900' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="sidebarActive"
                            className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-r-full"
                            initial={false}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        <div className={`transition-transform ${isActive ? 'scale-110 text-emerald-500' : 'group-hover:scale-110 text-slate-400 group-hover:text-slate-600'}`}>
                          {link.icon}
                        </div>
                        <span className="text-sm font-semibold">{link.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workspace Switcher */}
        <div className="p-4 border-t border-slate-200 shrink-0 relative bg-white">
          {workspaceOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl z-10">
              <button className="w-full text-left px-4 py-3 text-sm font-semibold text-emerald-600 bg-slate-50 flex items-center gap-2">
                <Building size={14} /> London Data Centre
              </button>
              <button className="w-full text-left px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2">
                <Building size={14} /> Frankfurt Phase 1
              </button>
              <button className="w-full text-left px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2">
                <Building size={14} /> Dublin Hyperscale
              </button>
              <Link to="/projects/new" className="w-full text-left px-4 py-3 text-sm font-medium text-indigo-600 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100">
                + Create New Project
              </Link>
            </div>
          )}
          <button 
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/55 rounded-xl p-3 flex items-center justify-between transition-colors"
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workspace</span>
              <span className="text-sm font-semibold text-emerald-600 truncate w-40 text-left">London Data Centre</span>
            </div>
            <ChevronDown size={16} className={`text-slate-500 transition-transform ${workspaceOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>
    </>
  );
}
