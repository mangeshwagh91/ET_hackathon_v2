import { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";
import NotificationDrawer from "../workspace/NotificationDrawer.jsx";

export default function AppLayout({ children, hideSidebar = false }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen flex font-sans bg-slate-50 text-slate-800">
      {!hideSidebar && <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />}

      <div className={`flex-1 flex flex-col min-h-screen ${!hideSidebar ? "lg:pl-64" : ""}`}>
        <Header toggleSidebar={toggleSidebar} hideSidebarToggle={hideSidebar} />

        <main className={`flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 ${hideSidebar ? "max-w-4xl" : "max-w-[1600px]"}`}>
          {children}
        </main>
      </div>

      <NotificationDrawer />
    </div>
  );
}
