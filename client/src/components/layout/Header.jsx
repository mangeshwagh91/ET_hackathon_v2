import { useState } from "react";
import { Search, HelpCircle, Lightbulb, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import ProfileDropdown from "../workspace/ProfileDropdown.jsx";

export default function Header({ toggleSidebar, hideSidebarToggle }) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-12 bg-[#0a0a0a] border-b border-[#27272a] flex items-center justify-between px-4 lg:px-6">
      {/* Left: Org Name & Badge */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {!hideSidebarToggle && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 -ml-2 rounded-md text-[#888888] hover:text-white hover:bg-[#1a1a1a] lg:hidden transition-colors"
          >
            <Menu size={18} />
          </button>
        )}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-white font-medium text-[15px] tracking-tight hover:text-[#eaeaea] transition-colors">
              mangeshwagh91's Org
            </span>
          </Link>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1a1a1a] text-[#888888] tracking-widest border border-[#27272a]">
            FREE
          </span>
        </div>
      </div>

      {/* Right: Controls & Profile */}
      <div className="flex items-center gap-4">
        <a href="#" className="hidden md:block text-[13px] font-medium text-[#888888] hover:text-white transition-colors">
          Feedback
        </a>
        
        {/* Search */}
        <div
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md w-56 transition-all duration-200 ${
            searchFocused
              ? "bg-[#000000] border border-[#444] ring-1 ring-[#444]"
              : "bg-[#000000] border border-[#27272a] hover:border-[#444]"
          }`}
        >
          <Search size={14} className="text-[#888888] shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="bg-transparent border-none outline-none text-[13px] text-white w-full placeholder:text-[#888888]"
          />
          <span className="text-[10px] text-[#888888] font-mono hidden lg:inline shrink-0 border border-[#27272a] rounded px-1 py-0.5 bg-[#1a1a1a]">
            Ctrl K
          </span>
        </div>

        <div className="flex items-center gap-2 text-[#888888]">
          <button className="p-1.5 rounded-md hover:text-white hover:bg-[#1a1a1a] transition-colors">
            <HelpCircle size={18} />
          </button>
          <button className="p-1.5 rounded-md hover:text-white hover:bg-[#1a1a1a] transition-colors">
            <Lightbulb size={18} />
          </button>
        </div>

        <div className="pl-1">
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}
