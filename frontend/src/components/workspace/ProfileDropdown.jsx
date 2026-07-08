import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { User, ActivitySquare, Bell, Settings, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";

export default function ProfileDropdown({ isOpen, onClose }) {
  const { logout, user } = useAuth();
  const { toggleNotifications } = useWorkspace();

  const name = user?.name || "EPC Project Team";
  const userTypeLabel = user?.type === "vendor" ? "Vendor Workspace" : "EPC Team Workspace";
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-14 w-64 bg-slate-900 border border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl z-50 overflow-hidden text-slate-200"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-slate-900 font-bold text-sm shadow-sm">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-bold text-white truncate max-w-[150px]">{name}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{userTypeLabel}</p>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="p-2 space-y-1">
              <Link to="/activity" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-850 hover:text-white rounded-xl transition-colors">
                <ActivitySquare size={16} /> Activity Center
              </Link>
              
              <button 
                onClick={() => { onClose(); toggleNotifications(); }} 
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-850 hover:text-white rounded-xl transition-colors"
              >
                <Bell size={16} /> Notifications
              </button>

              <Link to="/settings" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-850 hover:text-white rounded-xl transition-colors">
                <Settings size={16} /> Workspace Settings
              </Link>
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-slate-800">
              <button 
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
