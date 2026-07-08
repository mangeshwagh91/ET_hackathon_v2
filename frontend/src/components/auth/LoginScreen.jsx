import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext.jsx";
import ComplianceBackground from "../compliance/ComplianceBackground.jsx";

export default function LoginScreen() {
  const { loginAsTeam, loginAsVendor, registerVendor } = useAuth();
  const [role, setRole] = useState("team"); // "team" or "vendor"
  const [isRegister, setIsRegister] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (role === "team") {
        loginAsTeam();
      } else {
        if (isRegister) {
          if (!companyName || !email || !password) {
            setError("All fields are required");
            setLoading(false);
            return;
          }
          await registerVendor(companyName, email, password);
          setIsRegister(false);
          setError("Registration successful! Please login.");
        } else {
          if (!email || !password) {
            setError("Email and password are required");
            setLoading(false);
            return;
          }
          await loginAsVendor(email, password);
        }
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key="login"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, filter: "blur(20px)", scale: 1.05 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-50 text-slate-800"
      >
        <ComplianceBackground />
        
        {/* Neon Glows - Data Centre Aesthetic */}
        <motion.div 
          animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.2, 1] }} 
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-1/4 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none"
        />
        <motion.div 
          animate={{ opacity: [0.1, 0.2, 0.1], scale: [1.2, 1, 1.2] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[160px] pointer-events-none"
        />

        <div className="relative z-10 w-full max-w-lg px-6 my-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-8 md:p-10 rounded-[2.5rem] text-center"
          >
            {/* Logo */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 20 }}
              className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-emerald-500/10"
            >
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </motion.div>

            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">DCPI</h1>
            <p className="text-emerald-600 text-sm font-semibold tracking-wide uppercase mb-6">Data Centre Project Intelligence</p>

            {/* Role Switcher */}
            <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-200 mb-8">
              <button
                type="button"
                onClick={() => { setRole("team"); setIsRegister(false); setError(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${role === "team" ? "bg-white text-emerald-600 border border-slate-250 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Project Team
              </button>
              <button
                type="button"
                onClick={() => { setRole("vendor"); setError(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${role === "vendor" ? "bg-white text-emerald-600 border border-slate-250 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Vendor Portal
              </button>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-xl text-xs font-semibold mb-6 border ${error.includes("successful") ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-600"}`}
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="text-left space-y-5">
              {/* Inputs (Shared between Team and Vendor, except Company Name) */}
              {isRegister && role === "vendor" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Vertiv Corp"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder-slate-400 text-slate-800"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === "team" ? "admin@dcpi.com" : "vendor@company.com"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder-slate-400 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder-slate-400 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded bg-slate-50 border-slate-300 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-white" />
                  <span className="text-xs text-slate-500">Remember me</span>
                </label>
                <a href="#" className="text-xs font-semibold text-emerald-600 hover:underline">Forgot password?</a>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-900 font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 hover:shadow-xl flex items-center justify-center gap-2 group relative overflow-hidden mt-6"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {role === "team"
                        ? "Enter Project Management Workspace"
                        : isRegister
                        ? "Register Vendor Profile"
                        : "Login to Vendor Portal"}
                    </span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </motion.button>
            </form>

            {role === "vendor" && (
              <p className="text-xs text-slate-500 mt-6 text-center">
                {isRegister ? "Already registered?" : "New vendor?"}{" "}
                <button
                  type="button"
                  onClick={() => { setIsRegister(!isRegister); setError(""); }}
                  className="text-emerald-600 font-semibold hover:underline bg-transparent border-none p-0 focus:outline-none"
                >
                  {isRegister ? "Log In" : "Register Company Profile"}
                </button>
              </p>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
