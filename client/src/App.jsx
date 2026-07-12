import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Compliance from "./pages/Compliance.jsx";
import NCRDetail from "./pages/NCRDetail.jsx";
import Schedule from "./pages/Schedule.jsx";
import RFIChat from "./pages/RFIChat.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import BidsAndContracts from "./pages/BidsAndContracts.jsx";
import DocumentsPage from "./pages/DocumentsPage.jsx";
import VendorDashboard from "./pages/VendorDashboard.jsx";
import VendorBids from "./pages/VendorBids.jsx";
import VendorProfile from "./pages/VendorProfile.jsx";
import SplashScreen from "./components/splash/SplashScreen.jsx";
import PageTransition from "./components/PageTransition.jsx";
import NewProject from "./pages/NewProject.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import SupplyChainPage from "./pages/SupplyChainPage.jsx";
import IntegrationsPage from "./pages/IntegrationsPage.jsx";

// Auth and Workspace Layout
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { WorkspaceProvider } from "./context/WorkspaceContext.jsx";
import LoginScreen from "./components/auth/LoginScreen.jsx";
import LogoutAnimation from "./components/auth/LogoutAnimation.jsx";

const SPLASH_DURATION_MS = 3000;
const SPLASH_SEEN_KEY = "dcpi_splash_seen";

// Animated routes — must be inside BrowserRouter
function AnimatedRoutes() {
  const location = useLocation();
  const { user } = useAuth();

  if (user?.type === "vendor") {
    return (
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><VendorDashboard /></PageTransition>} />
          <Route path="/vendor/bids" element={<PageTransition><VendorBids /></PageTransition>} />
          <Route path="/vendor/profile" element={<PageTransition><VendorProfile /></PageTransition>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<PageTransition><ProjectsPage /></PageTransition>} />
        <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/integrations" element={<PageTransition><IntegrationsPage /></PageTransition>} />
        <Route path="/compliance" element={<PageTransition><Compliance /></PageTransition>} />
        <Route path="/ncr/:ncrId" element={<PageTransition><NCRDetail /></PageTransition>} />
        <Route path="/schedule" element={<PageTransition><Schedule /></PageTransition>} />
        <Route path="/rfi" element={<PageTransition><RFIChat /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
        <Route path="/bids" element={<PageTransition><BidsAndContracts /></PageTransition>} />
        <Route path="/supply-chain" element={<PageTransition><SupplyChainPage /></PageTransition>} />
        <Route path="/documents" element={<PageTransition><DocumentsPage /></PageTransition>} />
        <Route path="/projects/new" element={<PageTransition><NewProject /></PageTransition>} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

// Inner Application (Handles Auth Routing)
function ApplicationCore() {
  const { isAuthenticated, isLoggingOut } = useAuth();
  const location = useLocation();
  
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem(SPLASH_SEEN_KEY)
  );

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
      setShowSplash(false);
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [showSplash]);

  if (showSplash) {
    return (
      <AnimatePresence mode="sync">
        <SplashScreen key="splash" />
      </AnimatePresence>
    );
  }

  if (!isAuthenticated) {
    return (
      <motion.div
        key="public-workspace"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen"
      >
        <Routes>
          <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
          <Route path="/login" element={<PageTransition><LoginScreen isSignUp={false} /></PageTransition>} />
          <Route path="/signup" element={<PageTransition><LoginScreen isSignUp={true} /></PageTransition>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    );
  }

  const isFullscreen = location.pathname === "/projects/new";

  return (
    <motion.div
      key="workspace"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen"
    >
      {isLoggingOut && <LogoutAnimation />}
      <AppLayout hideSidebar={isFullscreen}>
        <AnimatedRoutes />
      </AppLayout>
    </motion.div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <BrowserRouter>
          <ApplicationCore />
        </BrowserRouter>
      </WorkspaceProvider>
    </AuthProvider>
  );
}
