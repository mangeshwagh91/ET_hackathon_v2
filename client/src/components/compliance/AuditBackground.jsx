import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function AmbientCrosshairs({ count = 8 }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const startX = 10 + Math.random() * 80;
        const startY = 10 + Math.random() * 80;
        const duration = 15 + Math.random() * 15;
        const opacity = 0.1 + Math.random() * 0.2;

        return (
          <motion.div
            key={i}
            className="absolute flex items-center justify-center text-teal-600/30"
            style={{ left: `${startX}%`, top: `${startY}%` }}
            initial={{ scale: 0.5, rotate: 0 }}
            animate={{
              scale: [0.5, 1.2, 0.5],
              rotate: [0, 90, 0],
              opacity: [0, opacity, opacity, 0]
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          >
            {/* Crosshair shape */}
            <div className="absolute w-[30px] h-[1px] bg-current" />
            <div className="absolute w-[1px] h-[30px] bg-current" />
            <div className="absolute w-[10px] h-[10px] border border-current rounded-full" />
          </motion.div>
        );
      })}
    </div>
  );
}

export default function AuditBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-slate-50">
      {/* Light Blueprint Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage: `linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Subtle Data Lines */}
      <div className="absolute inset-0 flex flex-col justify-between py-20 opacity-5 pointer-events-none">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[1px] w-full bg-slate-400" />
        ))}
      </div>

      {/* Floating Audit Scanners */}
      <AmbientCrosshairs count={12} />

      {/* Strict Color Gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-200/40 blur-[100px] mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-200/30 blur-[100px] mix-blend-multiply pointer-events-none" />
    </div>
  );
}
