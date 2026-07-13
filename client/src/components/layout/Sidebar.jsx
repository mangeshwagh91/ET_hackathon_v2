import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  FileText,
  HelpCircle,
  AlertCircle,
  ActivitySquare,
  Landmark,
  LayoutGrid,
  CreditCard,
  Settings,
  Truck,
  Triangle,
  LogOut
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const { user } = useAuth();
  const isTeam = user?.type === "team";
  const isGlobalPage = ["/projects", "/integrations", "/settings"].includes(location.pathname);
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = isOpen || isHovered;

  const globalLinks = [
    { name: "Projects", path: "/projects", icon: <LayoutGrid size={18} /> },
    { name: "Team", path: "#", icon: <FileText size={18} /> },
    { name: "Integrations", path: "#", icon: <BarChart3 size={18} /> },
    { name: "Usage", path: "#", icon: <ActivitySquare size={18} /> },
    { name: "Billing", path: "#", icon: <Landmark size={18} /> },
  ];

  const teamLinks = [
    { name: "Dashboard", path: "/dashboard", icon: <BarChart3 size={18} /> },
    { name: "Documents", path: "/documents", icon: <FileText size={18} /> },
    { name: "RFI Copilot", path: "/rfi", icon: <HelpCircle size={18} /> },
    { name: "Compliance", path: "/compliance", icon: <AlertCircle size={18} /> },
    { name: "Schedule", path: "/schedule", icon: <ActivitySquare size={18} /> },
    { name: "Design", path: "/design", icon: <LayoutGrid size={18} /> },
    { name: "Bids", path: "/bids", icon: <Landmark size={18} /> },
    { name: "Logistics", path: "/supply-chain", icon: <Truck size={18} /> },
  ];

  const vendorLinks = [
    { name: "Open Projects", path: "/", icon: <BarChart3 size={18} /> },
    { name: "My Bids", path: "/vendor/bids", icon: <Landmark size={18} /> },
    { name: "Vendor Profile", path: "/vendor/profile", icon: <FileText size={18} /> },
  ];

  const links = isGlobalPage ? globalLinks : isTeam ? teamLinks : vendorLinks;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Expandable Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed lg:sticky top-0 left-0 h-screen bg-[#000000] border-r border-[#27272a] z-50 flex flex-col py-4 transition-all duration-300 ease-in-out lg:translate-x-0 overflow-hidden shrink-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isExpanded ? "w-64 px-4" : "w-14 px-2 items-center"}`}
      >
        {/* Brand */}
        <div className={`flex w-full mb-6 ${isExpanded ? "justify-start px-2" : "justify-center"}`}>
          <Link
            to={isTeam ? "/projects" : "/"}
            className="flex items-center gap-3 text-white hover:text-emerald-400 transition-colors shrink-0"
            onClick={() => setIsOpen(false)}
            title="Home"
          >
            <Triangle size={20} className="fill-current text-white shrink-0" />
            {isExpanded && <span className="font-bold tracking-tight text-white whitespace-nowrap">DataForge AI</span>}
          </Link>
        </div>

        {/* Nav Icons */}
        <div className="flex-1 flex flex-col gap-1 w-full">
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                title={!isExpanded ? link.name : ""}
                className={`relative flex items-center rounded-md transition-colors group shrink-0 ${
                  isExpanded ? "justify-start gap-3 w-full px-3 py-1.5" : "justify-center w-9 h-9 mx-auto"
                } ${
                  isActive
                    ? "text-white bg-[#1e1e1e]"
                    : "text-[#888888] hover:text-white hover:bg-[#1a1a1a]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActive"
                    className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-[2px] h-5 bg-white rounded-r-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="shrink-0">{link.icon}</span>
                {isExpanded && <span className="text-[13px] font-medium whitespace-nowrap">{link.name}</span>}
              </Link>
            );
          })}
        </div>

        {/* Bottom Profile / Settings */}
        <div className="mt-auto flex flex-col gap-1 w-full">
           <button title={!isExpanded ? "Settings" : ""} className={`flex items-center rounded-lg text-[#888888] hover:text-white hover:bg-[#1a1a1a] transition-colors shrink-0 ${isExpanded ? "justify-start gap-3 w-full px-3 py-1.5" : "justify-center w-9 h-9 mx-auto"}`}>
             <Settings size={18} className="shrink-0" />
             {isExpanded && <span className="text-[13px] font-medium whitespace-nowrap">Settings</span>}
           </button>
           <button title={!isExpanded ? "Profile" : ""} className={`flex items-center rounded-lg text-[#888888] hover:text-white hover:bg-[#1a1a1a] transition-colors shrink-0 ${isExpanded ? "justify-start gap-3 w-full px-3 py-1.5" : "justify-center w-9 h-9 mx-auto"}`}>
             <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 shrink-0" />
             {isExpanded && <span className="text-[13px] font-medium whitespace-nowrap">Profile</span>}
           </button>
        </div>
      </aside>
    </>
  );
}
