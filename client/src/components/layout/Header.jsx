import { useState } from "react";
import { Triangle, Search, HelpCircle, Lightbulb, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import ProfileDropdown from "../workspace/ProfileDropdown.jsx";

export default function Header({ toggleSidebar, hideSidebarToggle }) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-12 bg-[#131413] border-b border-[#2A2C2A] flex items-center justify-between pr-4 pl-4 lg:pl-0 lg:pr-6">
      {/* Left: Org Name & Badge */}
      <div className="flex items-center flex-1 min-w-0">
        {!hideSidebarToggle && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md text-[#8A8D8A] hover:text-white hover:bg-[#181A19] lg:hidden transition-colors mr-2"
          >
            <Menu size={18} />
          </button>
        )}
        <Link to="/" className="flex items-center">
          <div className="hidden lg:flex w-14 items-center justify-center shrink-0">
            <Triangle size={18} className="fill-current text-white mt-0.5" />
          </div>
          <div className="lg:hidden flex items-center justify-center shrink-0 mr-2">
            <Triangle size={18} className="fill-current text-white mt-0.5" />
          </div>
          <span className="text-white font-medium text-[15px] tracking-tight hover:text-[#EDEFEE] transition-colors">
            EPC Company's Org
          </span>
        </Link>
      </div>

      {/* Right: Controls & Profile */}
      <div className="flex items-center gap-4">
        <a href="#" className="hidden md:block text-[13px] font-medium text-[#8A8D8A] hover:text-white transition-colors">
          Feedback
        </a>
        
        {/* Search */}
        <div
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md w-56 transition-all duration-200 ${
            searchFocused
              ? "bg-[#131413] border border-[#8A8D8A] ring-1 ring-[#8A8D8A]"
              : "bg-[#131413] border border-[#2A2C2A] hover:border-[#8A8D8A]"
          }`}
        >
          <Search size={14} className="text-[#8A8D8A] shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="bg-transparent border-none outline-none text-[13px] text-white w-full placeholder:text-[#8A8D8A]"
          />
          <span className="text-[10px] text-[#8A8D8A] font-mono hidden lg:inline shrink-0 border border-[#2A2C2A] rounded px-1 py-0.5 bg-[#181A19]">
            Ctrl K
          </span>
        </div>

        <div className="flex items-center gap-2 text-[#8A8D8A]">
          <button className="p-1.5 rounded-md hover:text-white hover:bg-[#181A19] transition-colors">
            <HelpCircle size={18} />
          </button>
          <button className="p-1.5 rounded-md hover:text-white hover:bg-[#181A19] transition-colors">
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
