import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function AmbientGanttBars({ count = 10 }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const startY = 10 + Math.random() * 80;
        const width = 10 + Math.random() * 30;
        const duration = 20 + Math.random() * 20;
        const opacity = 0.05 + Math.random() * 0.15;
        const color = i % 3 === 0 ? "#0284c7" : i % 3 === 1 ? "#4f46e5" : "#0ea5e9"; // Sky/Indigo

        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ 
              height: "4px", 
              width: `${width}%`, 
              top: `${startY}%`, 
              backgroundColor: color,
              left: "-50%" 
            }}
            initial={{ x: "-100%" }}
            animate={{
              x: ["-10%", "200%"],
              opacity: [0, opacity, opacity, 0]
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 10,
            }}
          />
        );
      })}
    </div>
  );
}

export default function ScheduleBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-slate-50">
      {/* Light Noise Texture */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-multiply" 
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
      
      {/* Vertical Grid Lines mimicking a calendar/timeline */}
      <div className="absolute inset-0 flex justify-between px-20 opacity-10 pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="w-[1px] h-full bg-slate-400" />
        ))}
      </div>

      {/* Floating Gantt Bars */}
      <AmbientGanttBars count={25} />

      {/* Color Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-sky-200/40 blur-[120px] mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-200/30 blur-[120px] mix-blend-multiply pointer-events-none" />
    </div>
  );
}
