import { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";
import NotificationDrawer from "../workspace/NotificationDrawer.jsx";

export default function AppLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      {/* Main Content Wrapper - Shifts right on desktop */}
      <div className="flex-1 flex flex-col lg:pl-64 transition-all duration-300 min-h-screen relative">
        <Header toggleSidebar={toggleSidebar} />
        
        {/* Page Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      <NotificationDrawer />
    </div>
  );
}
