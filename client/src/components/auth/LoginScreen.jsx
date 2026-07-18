import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";

// ─── Blueprint / grid background ──────────────────────────────────────────────
function BlueprintBackground() {
  return (
    <>
      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right,  rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
        }}
      />
      {/* Ambient glow blobs */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-[#b08d6e]/[0.05] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#b08d6e]/[0.04] rounded-full blur-[120px] pointer-events-none" />
      {/* Noise/grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />
    </>
  );
}

// ─── Input Field ─────────────────────────────────────────────────────────────
function AuthInput({ label, type = "text", value, onChange, placeholder, icon }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold text-[#8a847b] uppercase tracking-[0.12em]">
        {label}
      </label>
      <div className={`relative flex items-center rounded-xl border transition-all duration-200 ${
        focused
          ? "border-[#b08d6e]/60 bg-[#0f1a14] shadow-[0_0_0_3px_rgba(16,185,129,0.08)]"
          : "border-[#333330] bg-[#1a1a1a]"
      }`}>
        {icon && (
          <span className={`pl-3.5 shrink-0 transition-colors ${focused ? "text-[#b08d6e]" : "text-[#8a847b]"}`}>
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full bg-transparent px-3.5 py-3 text-sm text-[#f0ece4] placeholder-[#333330] focus:outline-none"
        />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LoginScreen({ isSignUp: isSignUpInitial = false }) {
  const { loginAsTeam, loginAsVendor, registerVendor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isRegister, setIsRegister] = useState(isSignUpInitial);
  const [role, setRole] = useState("team");

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsRegister(isSignUpInitial);
    setError("");
  }, [isSignUpInitial]);

  useEffect(() => {
    if (location.pathname === "/signup") {
      setIsRegister(true);
      setRole("vendor");
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
          setError("Registration successful! Please sign in.");
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
      setRole("vendor");
      navigate("/signup");
    } else {
      navigate("/login");
    }
  };

  // Icon SVGs
  const UserIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
  const BuildingIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
  const MailIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
  const LockIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
  const ArrowLeft = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" /><path d="m12 5-7 7 7 7" />
    </svg>
  );

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#1a1a1a] font-sans">
      <BlueprintBackground />

      {/* ─── Home Button ────────────────────────────────────────── */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 z-30 flex items-center gap-2 bg-[#1a1a1a]/80 hover:bg-[#222222] border border-[#333330] hover:border-[#333330] px-4 py-2.5 rounded-xl text-xs font-bold text-[#8a847b] hover:text-[#f0ece4] transition-all backdrop-blur-sm"
      >
        {ArrowLeft}
        <span>Home</span>
      </motion.button>

      {/* ─── Logo top-center ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5"
      >
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        </div>
        <div>
          <span className="font-extrabold text-white text-[15px] tracking-tight leading-none block">DataForge AI</span>
          <span className="text-[9px] text-[#8a847b] tracking-widest uppercase font-bold">Platform</span>
        </div>
      </motion.div>

      {/* ─── Main Card ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[960px] mx-4 my-16 rounded-2xl overflow-hidden border border-[#222222]"
        style={{ boxShadow: "0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)" }}
      >
        <div className={`grid md:grid-cols-2 min-h-[600px] transition-all duration-500`}>

          {/* ─── FORM PANEL ─────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`form-${isRegister}`}
              initial={{ opacity: 0, x: isRegister ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRegister ? 20 : -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`flex flex-col justify-center p-8 md:p-12 bg-[#222222] ${isRegister ? "order-1" : "order-1 md:order-2"}`}
            >
              {/* Header */}
              <div className="mb-7">
                <h2 className="text-2xl font-extrabold text-[#f0ece4] tracking-tight mb-1.5">
                  {isRegister ? "Create Account" : "Welcome Back"}
                </h2>
                <p className="text-xs text-[#8a847b] font-medium leading-relaxed">
                  {isRegister
                    ? "Join DataForge AI — your AI-powered project intelligence platform"
                    : "Sign in to continue orchestrating your AI agents"}
                </p>
              </div>

              {/* Role Switcher */}
              <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-[#222222] mb-6 gap-1">
                {[
                  { key: "team", label: "Project Team" },
                  { key: "vendor", label: "Vendor Portal" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setRole(key); setError(""); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                      role === key
                        ? "bg-[#b08d6e]/10 text-[#b08d6e] border border-[#b08d6e]/20"
                        : "text-[#8a847b] hover:text-[#8a847b]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Error / Success banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={`p-3 rounded-xl text-xs font-semibold mb-5 border flex items-start gap-2.5 ${
                      error.includes("successful")
                        ? "bg-[#b08d6e]/10 border-[#b08d6e]/20 text-[#b08d6e]"
                        : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {error.includes("successful") ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      )}
                    </span>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <>
                    <AuthInput
                      label="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      icon={UserIcon}
                    />
                    <AuthInput
                      label="Organization"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your company or institution"
                      icon={BuildingIcon}
                    />
                  </>
                )}

                <AuthInput
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  icon={MailIcon}
                />

                <AuthInput
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  icon={LockIcon}
                />

                {isRegister && (
                  <AuthInput
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    icon={LockIcon}
                  />
                )}

                {!isRegister && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-[#8a847b] hover:text-[#8a847b] transition-colors">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-emerald-500"
                      />
                      <span>Remember me</span>
                    </label>
                    <a href="#" className="font-semibold text-[#b08d6e]/80 hover:text-[#b08d6e] transition-colors">
                      Forgot password?
                    </a>
                  </div>
                )}

                {isRegister && (
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#8a847b] pt-1">
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      className="w-3.5 h-3.5 rounded mt-0.5 accent-emerald-500 shrink-0"
                    />
                    <span>
                      I agree to the{" "}
                      <a href="#" className="font-bold text-[#b08d6e]/80 hover:text-[#b08d6e] transition-colors">Terms of Service</a>
                      {" "}and{" "}
                      <a href="#" className="font-bold text-[#b08d6e]/80 hover:text-[#b08d6e] transition-colors">Privacy Policy</a>
                    </span>
                  </label>
                )}

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="w-full relative overflow-hidden bg-[#b08d6e] hover:bg-[#8c6f55] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 mt-6"
                  style={{ boxShadow: "0 0 30px rgba(16,185,129,0.2)" }}
                >
                  {/* Shimmer */}
                  {!loading && (
                    <div className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                  )}
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isRegister ? "Create Account" : "Sign In"}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                      </svg>
                    </>
                  )}
                </motion.button>
              </form>

              {/* Mobile toggle */}
              <p className="text-xs text-[#8a847b] text-center mt-6 md:hidden">
                {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                <button onClick={toggleMode} className="font-bold text-[#b08d6e] hover:text-[#b08d6e] transition-colors">
                  {isRegister ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </motion.div>
          </AnimatePresence>

          {/* ─── GREETING PANEL ──────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-${isRegister}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className={`hidden md:flex flex-col justify-between p-10 relative overflow-hidden bg-[#1a1a1a] border-l border-[#222222] ${isRegister ? "order-2" : "order-2 md:order-1"}`}
            >
              {/* Ambient glow */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[350px] h-[350px] bg-[#b08d6e]/[0.06] rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[250px] h-[250px] bg-[#b08d6e]/[0.04] rounded-full blur-[80px]" />
              </div>

              {/* Grid on panel */}
              <div
                className="absolute inset-0 pointer-events-none opacity-100"
                style={{
                  backgroundImage: `
                    linear-gradient(to right,  rgba(255,255,255,0.018) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255,255,255,0.018) 1px, transparent 1px)
                  `,
                  backgroundSize: "44px 44px",
                }}
              />

              {/* Top badge */}
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-[#b08d6e]/10 border border-[#b08d6e]/20 text-[#b08d6e] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-[#b08d6e] rounded-full animate-pulse" />
                  AI-Powered Platform
                </div>
              </div>

              {/* Main content */}
              <div className="relative z-10 space-y-6">
                <h3 className="text-3xl font-extrabold text-[#f0ece4] tracking-tight leading-tight">
                  {isRegister ? (
                    <>Welcome to<br /><span className="text-[#b08d6e]">DataForge AI</span></>
                  ) : (
                    <>Good to have<br />you <span className="text-[#b08d6e]">back.</span></>
                  )}
                </h3>
                <p className="text-sm text-[#8a847b] leading-relaxed max-w-xs">
                  {isRegister
                    ? "Register to start orchestrating AI agents for your data centre project — from vendor bidding to compliance monitoring."
                    : "Access your project intelligence dashboard, manage your AI agents, and keep your projects running at peak performance."}
                </p>

                {/* Feature pills */}
                <div className="flex flex-col gap-2.5 pt-2">
                  {[
                    "Automated vendor bidding & evaluation",
                    "Real-time compliance monitoring",
                    "AI-powered RFI resolution",
                  ].map((feat, i) => (
                    <motion.div
                      key={feat}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-center gap-2.5 text-xs text-[#8a847b]"
                    >
                      <span className="w-4 h-4 rounded-full bg-[#b08d6e]/15 border border-[#b08d6e]/25 flex items-center justify-center shrink-0">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#b08d6e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      {feat}
                    </motion.div>
                  ))}
                </div>

                {/* Toggle CTA */}
                <div className="pt-4">
                  <p className="text-xs text-[#8a847b] mb-3">
                    {isRegister ? "Already registered?" : "New to DataForge AI?"}
                  </p>
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#333330] hover:border-[#b08d6e]/40 text-xs font-bold text-[#8a847b] hover:text-[#b08d6e] transition-all duration-200"
                  >
                    {isRegister ? "Sign In Instead" : "Create an Account"}
                    <svg
                      width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className="group-hover:translate-x-0.5 transition-transform"
                    >
                      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Decorative stat chips */}
              <div className="relative z-10 flex flex-wrap gap-3">
                {[
                  { label: "Active Projects", value: "240+" },
                  { label: "AI Agents", value: "12" },
                  { label: "Compliance Rate", value: "99.2%" },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col bg-[#1a1a1a] border border-[#222222] rounded-xl px-4 py-2.5"
                  >
                    <span className="text-sm font-extrabold text-[#b08d6e]">{value}</span>
                    <span className="text-[10px] text-[#8a847b] font-medium mt-0.5">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

        </div>
      </motion.div>
    </div>
  );
}
