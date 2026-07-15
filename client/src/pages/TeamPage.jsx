import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Search, BookOpen, UserPlus, User } from "lucide-react";

export default function TeamPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("engineering");

  return (
    <div className="flex flex-col h-screen bg-[#131413] text-white">
      {/* ─── Main Content ─── */}
      <div className="flex-1 p-10 max-w-6xl mx-auto w-full pt-16">
        <h1 className="text-[22px] font-bold tracking-tight mb-8">Team</h1>

        <div className="flex items-center justify-between mb-4">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8D8A]" />
            <input
              type="text"
              placeholder="Filter members"
              className="w-full bg-[#181A19] border border-[#2A2C2A] rounded-md py-1.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-[#2A2C2A] transition-colors"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#2A2C2A] text-sm font-medium hover:bg-[#2A2C2A] transition-colors">
              <BookOpen size={14} />
              Docs
            </button>
            <button
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center gap-2 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              <UserPlus size={14} />
              Invite members
            </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="border border-[#2A2C2A] rounded-lg overflow-hidden bg-[#181A19]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#181A19] border-b border-[#2A2C2A]">
              <tr>
                <th className="px-6 py-4 font-semibold text-[11px] text-[#8A8D8A] tracking-widest uppercase">Member</th>
                <th className="px-6 py-4 font-semibold text-[11px] text-[#8A8D8A] tracking-widest uppercase">MFA</th>
                <th className="px-6 py-4 font-semibold text-[11px] text-[#8A8D8A] tracking-widest uppercase">Role</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2C2A]">
              <tr className="hover:bg-[#2A2C2A]/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-[#2A2C2A] flex items-center justify-center bg-[#131413]">
                      <User size={14} className="text-[#8A8D8A]" />
                    </div>
                    <span className="font-medium text-[13px]">wmangesh91@gmail.com</span>
                    <span className="px-1.5 py-0.5 rounded-full border border-[#2A2C2A] text-[9px] font-bold text-[#8A8D8A] bg-[#2A2C2A]">YOU</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-[#8A8D8A] text-[13px]">
                    Disabled <X size={12} className="text-[#8A8D8A]" />
                  </div>
                </td>
                <td className="px-6 py-4 text-white font-medium text-[13px]">Project Management</td>
                <td className="px-6 py-4 text-right">
                  <button className="px-3 py-1.5 rounded-md border border-[#2A2C2A] text-xs font-medium text-[#8A8D8A] hover:text-white hover:border-[#52525b] transition-colors bg-[#131413]">
                    Leave team
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-[#181A19] border-t border-[#2A2C2A]">
              <tr>
                <td colSpan={4} className="px-6 py-3 text-xs text-[#8A8D8A]">
                  1 member
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {isInviteOpen && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 99998 }}
            onClick={() => setIsInviteOpen(false)}
          />
          <div
            className="fixed right-0 top-0 bottom-0 bg-[#181A19] border-l border-[#2A2C2A] flex flex-col shadow-2xl animate-in slide-in-from-right"
            style={{ width: '600px', zIndex: 99999 }}
          >

            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-[#2A2C2A]">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white mb-0.5">Invite team members</h2>
                  <p className="text-[#8A8D8A] text-xs">
                    Send invitations and choose the access each new team member receives.
                  </p>
                </div>
                <button 
                  onClick={() => setIsInviteOpen(false)}
                  className="p-1 hover:bg-[#2A2C2A] rounded-md transition-colors text-[#8A8D8A] hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

              {/* SSO Callout */}
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-white mb-0.5">Single Sign-On (SSO) available</h3>
                <p className="text-[#8A8D8A] text-xs mb-3">
                  Enforce login via your company identity provider for added security and access control. Available on Team plan and above.
                </p>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-3 py-1 rounded-md border border-[#2A2C2A] text-xs font-medium hover:bg-[#2A2C2A] transition-colors">
                    <BookOpen size={14} />
                    Docs
                  </button>
                  {/* Upgrade button removed as requested */}
                </div>
              </div>

              {/* Roles */}
              <div className="flex flex-col gap-3 mb-5">
                <h3 className="text-sm font-semibold text-white">Role</h3>
                <div className="flex flex-col rounded-lg border border-[#2A2C2A] overflow-hidden bg-[#131413]">

                  {/* Project Management & Leadership Team */}
                  <label className={`flex gap-3 p-3 cursor-pointer transition-colors ${selectedRole === "management" ? "bg-[#2A2C2A]/50 border border-[#3ECF8E]/50 relative" : "hover:bg-[#181A19]"}`}>
                    <div className="pt-0.5">
                      <input
                        type="radio"
                        name="role"
                        value="management"
                        checked={selectedRole === "management"}
                        onChange={() => setSelectedRole("management")}
                        className="accent-[#3ECF8E] w-4 h-4"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white mb-1">Project Management & Leadership Team</div>
                      <div className="text-xs text-[#8A8D8A]">
                        Full oversight and approval authority. Manage organization settings, billing, and all project data.
                      </div>
                    </div>
                  </label>

                  <div className="h-px bg-[#2A2C2A] w-full" />

                  {/* Engineering & Technical Team */}
                  <label className={`flex gap-3 p-3 cursor-pointer transition-colors ${selectedRole === "engineering" ? "bg-[#2A2C2A]/50 border border-[#3ECF8E]/50 relative" : "hover:bg-[#181A19]"}`}>
                    <div className="pt-0.5">
                      <input
                        type="radio"
                        name="role"
                        value="engineering"
                        checked={selectedRole === "engineering"}
                        onChange={() => setSelectedRole("engineering")}
                        className="accent-[#3ECF8E] w-4 h-4"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white mb-1">Engineering & Technical Team</div>
                      <div className="text-xs text-[#8A8D8A]">
                        Manage design models, commissioning checklists, and RFI processes. Cannot delete projects or manage billing.
                      </div>
                    </div>
                  </label>

                  <div className="h-px bg-[#2A2C2A] w-full" />

                  {/* Execution & Site Team */}
                  <label className={`flex gap-3 p-3 cursor-pointer transition-colors ${selectedRole === "execution" ? "bg-[#2A2C2A]/50 border border-[#3ECF8E]/50 relative" : "hover:bg-[#181A19]"}`}>
                    <div className="pt-0.5">
                      <input
                        type="radio"
                        name="role"
                        value="execution"
                        checked={selectedRole === "execution"}
                        onChange={() => setSelectedRole("execution")}
                        className="accent-[#3ECF8E] w-4 h-4"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white mb-1">Execution & Site Team</div>
                      <div className="text-xs text-[#8A8D8A]">
                        View schedules, submit field reports, and access approved documents. Limited write access.
                      </div>
                    </div>
                  </label>

                </div>
              </div>

              {/* Email Addresses */}
              <div className="flex flex-col gap-3 mb-4">
                <h3 className="text-sm font-semibold text-white">Email addresses</h3>
                <textarea
                  rows={4}
                  placeholder="name@example.com, name2@example.com, ..."
                  className="w-full bg-[#131413] border border-[#2A2C2A] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#3ECF8E] transition-colors resize-none"
                />
              </div>

            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-[#2A2C2A] bg-[#181A19] flex items-center justify-end gap-3">
              <button
                onClick={() => setIsInviteOpen(false)}
                className="px-4 py-2 rounded-md border border-[#2A2C2A] text-sm font-medium text-white hover:bg-[#2A2C2A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Send invitation
              </button>
            </div>

          </div>
        </>,
        document.body
      )}
    </div>
  );
}
