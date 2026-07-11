import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import ComplianceBackground from "../compliance/ComplianceBackground.jsx";

export default function LoginScreen({ isSignUp: isSignUpInitial = false }) {
  const { loginAsTeam, loginAsVendor, registerVendor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isRegister, setIsRegister] = useState(isSignUpInitial);
  const [role, setRole] = useState("team"); // "team" or "vendor"

  // Form states
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync with prop when routing changes (e.g. clicking Sign In vs Start Your Project in landing page)
  useEffect(() => {
    setIsRegister(isSignUpInitial);
    setError("");
  }, [isSignUpInitial]);

  // If URL changes, also match state
  useEffect(() => {
    if (location.pathname === "/signup") {
      setIsRegister(true);
      setRole("vendor"); // Default signup is for vendors
    } else if (location.pathname === "/login") {
      setIsRegister(false);
    }
  }, [location.pathname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (role === "team") {
        if (isRegister) {
          setError("Project Team registration is managed by administrators. Please use the Vendor Portal to register.");
          setLoading(false);
          return;
        }
        loginAsTeam();
      } else {
        if (isRegister) {
          if (!companyName || !email || !password) {
            setError("All fields are required");
            setLoading(false);
            return;
          }
          if (password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
          }
          if (!agree) {
            setError("You must agree to the Terms of Service and Privacy Policy");
            setLoading(false);
            return;
          }
          await registerVendor(companyName, email, password);
          setIsRegister(false);
          setError("Registration successful! Please login.");
          navigate("/login");
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

  const toggleMode = () => {
    const nextMode = !isRegister;
    setIsRegister(nextMode);
    setError("");
    if (nextMode) {
      setRole("vendor"); // Auto-switch to vendor for signup
      navigate("/signup");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-50 text-slate-800 font-sans">
      
      {/* Background split visual */}
      <div className="absolute inset-0 flex flex-col md:flex-row pointer-events-none z-0">
        <div className="flex-1 bg-slate-50 relative overflow-hidden">
          <ComplianceBackground />
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
        </div>
        <div className="flex-1 bg-white border-t md:border-t-0 md:border-l border-slate-200 relative">
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
          
          {/* Blueprint grid on the right side */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(0,0,0,1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,1) 1px, transparent 1px)
              `,
              backgroundSize: "36px 36px",
            }}
          />
        </div>
      </div>

      {/* Floating Home Button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 z-30 flex items-center gap-2 bg-white/80 hover:bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 transition-all shadow-sm backdrop-blur-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span>Home</span>
      </button>

      {/* Center Capsule Modal */}
      <div className="relative z-10 w-full max-w-5xl mx-4 my-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden backdrop-blur-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[600px]">
          
          {/* ANIMATED LAYOUT FLIP USING FLEX DIRECTION OR ABSOLUTE MAPPING */}
          {/* We dynamically change column ordering based on isRegister */}
          <div className={`flex flex-col justify-between p-8 md:p-12 ${isRegister ? 'order-1' : 'order-1 md:order-2'} bg-white`}>
            <div>
              {/* Form Title */}
              <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight mb-1">
                {isRegister ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="text-xs text-slate-500 font-semibold mb-6">
                {isRegister 
                  ? "Join us to start your project intelligence journey" 
                  : "Sign in to continue your project intelligence journey"}
              </p>

              {/* Role Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mb-6">
                <button
                  type="button"
                  onClick={() => { setRole("team"); setError(""); }}
                  disabled={isRegister}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${role === "team" ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50" : "text-slate-550 hover:text-slate-800 disabled:opacity-40"}`}
                >
                  Project Team
                </button>
                <button
                  type="button"
                  onClick={() => { setRole("vendor"); setError(""); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${role === "vendor" ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50" : "text-slate-550 hover:text-slate-800"}`}
                >
                  Vendor Portal
                </button>
              </div>

              {/* Errors */}
              {error && (
                <div className={`p-3 rounded-xl text-xs font-semibold mb-6 border ${error.includes("successful") ? "bg-emerald-50 border-emerald-250 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                  {error}
                </div>
              )}

              {/* Form Fields */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-all placeholder-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Organization</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Your company or institution"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-all placeholder-slate-400"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-all placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-all placeholder-slate-400"
                  />
                </div>

                {isRegister && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-all placeholder-slate-400"
                    />
                  </div>
                )}

                {!isRegister && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-500">
                      <input type="checkbox" className="w-4 h-4 rounded bg-slate-50 border-slate-200 text-emerald-500 focus:ring-emerald-500/30" />
                      <span>Remember me</span>
                    </label>
                    <a href="#" className="font-semibold text-emerald-600 hover:underline">Forgot your password?</a>
                  </div>
                )}

                {isRegister && (
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-550 pt-2">
                    <input 
                      type="checkbox" 
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-50 border-slate-200 text-emerald-500 focus:ring-emerald-500/30 mt-0.5" 
                    />
                    <span>I agree to the <a href="#" className="font-bold text-emerald-600 hover:underline">Terms of Service</a> and <a href="#" className="font-bold text-emerald-600 hover:underline">Privacy Policy</a></span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 mt-6 text-sm"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{isRegister ? "Sign Up" : "Sign In"}</span>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* SIDE CARD GREETING PANEL */}
          <div className={`flex flex-col justify-center items-center text-center p-8 md:p-12 relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 text-white ${isRegister ? 'order-2' : 'order-2 md:order-1'}`}>
            
            {/* Absolute visual glows on the greeting panel */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 max-w-sm space-y-6">
              <h3 className="text-3xl font-extrabold text-white">
                {isRegister ? "Hello, Friend!" : "Welcome Back!"}
              </h3>
              <p className="text-sm text-emerald-100/90 leading-relaxed font-medium">
                {isRegister 
                  ? "Register with your details to start your journey with our AI-powered Data Centre Project Intelligence platform" 
                  : "Enter your credentials to access your project dashboard and continue orchestrating your AI agents"}
              </p>
              
              <div className="pt-4">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="px-8 py-3 bg-transparent border-2 border-white/80 hover:border-white text-white font-bold rounded-full transition-all text-xs tracking-wider uppercase hover:scale-105"
                >
                  {isRegister ? "Sign In" : "Sign Up"}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
