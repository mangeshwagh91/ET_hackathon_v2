import { useState } from "react";
import { Menu, Search, Bell, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import ProfileDropdown from "../workspace/ProfileDropdown.jsx";

export default function Header({ toggleSidebar, hideSidebarToggle }) {
  const { toggleNotifications, unreadNotifications, currentProject } = useWorkspace();
  const { user } = useAuth();
  const location = useLocation();
  const [searchFocused, setSearchFocused] = useState(false);

  const routeLabel = {
    "/dashboard": "Dashboard",
    "/documents": "Documents & Specs",
    "/rfi": "RFI Copilot",
    "/compliance": "Compliance & NCRs",
    "/schedule": "Schedule Risk",
    "/commissioning": "Commissioning",
    "/bids": "Bids & Contracts",
    "/activity": "Activity Log",
    "/projects": "Projects",
    "/projects/new": "New Project",
  }[location.pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
      {/* Left */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {hideSidebarToggle ? (
          <Link to="/" className="flex items-center gap-2 font-black text-lg tracking-tighter text-slate-900">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm shadow-emerald-500/20">
              <span className="text-white font-black text-[11px]">DC</span>
            </div>
            DCPI
          </Link>
        ) : (
          <>
            <button
              onClick={toggleSidebar}
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden transition-colors"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1 text-sm">
              <span className="text-slate-400 font-medium">{currentProject?.name ?? "DCPI"}</span>
              <ChevronRight size={13} className="text-slate-300 mx-0.5" />
              <span className="text-slate-700 font-semibold">{routeLabel}</span>
            </div>
          </>
        )}

        {/* Search */}
        <div
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full w-60 transition-all duration-200 ${
            searchFocused
              ? "bg-white border border-emerald-400 ring-2 ring-emerald-500/10"
              : "bg-slate-50 border border-slate-200"
          }`}
        >
          <Search size={13} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder:text-slate-400"
          />
          <span className="text-[10px] text-slate-300 font-mono hidden lg:inline shrink-0">⌘K</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">

<button
          onClick={toggleNotifications}
          className="relative p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <Bell size={17} />
          {unreadNotifications > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
          )}
        </button>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        <ProfileDropdown />
      </div>
    </header>
  );
}
