import { Menu, Search, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import ProfileDropdown from "../workspace/ProfileDropdown.jsx";

export default function Header({ toggleSidebar }) {
  const { toggleNotifications, unreadNotifications } = useWorkspace();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/85 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 lg:px-8">
      {/* Left section: Mobile menu & Title/Search context */}
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={toggleSidebar}
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={20} />
        </button>

        {/* Global Search (Hidden on very small screens) */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full w-64 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
          <Search size={14} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Search projects, bids, documents..." 
            className="bg-transparent border-none outline-none text-sm text-slate-800 w-full placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right section: Actions & Profile */}
      <div className="flex items-center gap-3">
        {user?.type === "team" && (
          <Link 
            to="/projects/new"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-sm font-bold transition-colors"
          >
            <span className="text-lg leading-none mb-0.5">+</span> New Project
          </Link>
        )}

        <button 
          onClick={toggleNotifications}
          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition-colors relative"
        >
          <Bell size={18} />
          {unreadNotifications > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
          )}
        </button>

        <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1"></div>

        <ProfileDropdown />
      </div>
    </header>
  );
}
