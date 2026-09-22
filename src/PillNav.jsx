import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PillNav({ items, activeHref }) {
  const [hoveredHref, setHoveredHref] = useState(null);

  return (
    <nav className="flex items-center gap-1 p-2 rounded-[2rem] bg-[#f5f3ec] shadow-skeuo-inner dark:bg-[#111111] dark:shadow-skeuo-inner-dark">
      <AnimatePresence>
        {items.map((item) => {
          const isActive = activeHref === item.href;
          const isHovered = hoveredHref === item.href;
          
          return (
            <a
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHoveredHref(item.href)}
              onMouseLeave={() => setHoveredHref(null)}
              className={`relative px-5 py-2.5 rounded-full text-sm font-extrabold transition-colors z-10 
                ${isActive || isHovered ? "text-teal-600 dark:text-teal-400" : "text-slate-500 dark:text-slate-400"}
              `}
            >
              {isHovered && (
                <motion.div
                  layoutId="pill-nav-hover"
                  className="absolute inset-0 rounded-full bg-[#f5f3ec] shadow-skeuo-btn dark:bg-[#111111] dark:shadow-skeuo-btn-dark z-[-1]"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {/* Show the pressed state for the active tab, unless it's currently being hovered */}
              {!isHovered && isActive && (
                <motion.div
                  layoutId="pill-nav-active"
                  className="absolute inset-0 rounded-full bg-[#f5f3ec] shadow-skeuo-btn-pressed dark:bg-[#111111] dark:shadow-skeuo-btn-pressed-dark z-[-1]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{item.label}</span>
            </a>
          );
        })}
      </AnimatePresence>
    </nav>
  );
}
