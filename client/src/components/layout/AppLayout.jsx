import { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";
import NotificationDrawer from "../workspace/NotificationDrawer.jsx";

export default function AppLayout({ children, hideSidebar = false }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="h-full w-full flex font-sans bg-[#000000] text-[#eaeaea] overflow-hidden">
      {!hideSidebar && <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />}

      <div className={`flex-1 flex flex-col h-full min-w-0`}>
        <Header toggleSidebar={toggleSidebar} hideSidebarToggle={hideSidebar} />

        <main className="flex-1 w-full flex flex-col overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>

      <NotificationDrawer />
    </div>
  );
}
