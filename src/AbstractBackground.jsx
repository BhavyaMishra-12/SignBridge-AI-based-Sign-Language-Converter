import React from 'react';
import { motion, useScroll, useTransform, useAnimationFrame, useMotionValue } from 'framer-motion';
import Particles from './Particles';

export default function AbstractBackground({ cursorX, cursorY }) {
  const { scrollYProgress } = useScroll();
  const time = useMotionValue(0);
  
  useAnimationFrame((t) => {
    time.set(t);
  });
  
  // Base expansion and contraction tied to scroll + Idle wave
  const scrollS1 = useTransform(scrollYProgress, [0, 1], [1, 1.3]);
  const scrollR1 = useTransform(scrollYProgress, [0, 1], [0, 15]);
  const scale1 = useTransform([scrollS1, time], ([s, t]) => s + Math.sin(t / 2000) * 0.02);
  const rotate1 = useTransform([scrollR1, time], ([r, t]) => r + Math.sin(t / 3000) * 3);
  
  const scrollS2 = useTransform(scrollYProgress, [0, 1], [1.1, 0.9]);
  const scrollR2 = useTransform(scrollYProgress, [0, 1], [0, -10]);
  const scale2 = useTransform([scrollS2, time], ([s, t]) => s + Math.cos(t / 2500) * 0.03);
  const rotate2 = useTransform([scrollR2, time], ([r, t]) => r + Math.sin(t / 2000) * 2.5);
  
  const scrollS3 = useTransform(scrollYProgress, [0, 1], [0.9, 1.4]);
  const scrollR3 = useTransform(scrollYProgress, [0, 1], [-5, 5]);
  const scale3 = useTransform([scrollS3, time], ([s, t]) => s + Math.sin(t / 3500) * 0.02);
  const rotate3 = useTransform([scrollR3, time], ([r, t]) => r + Math.cos(t / 2500) * 3);

  // Globe scroll + Idle continuous rotation and revolving
  const scrollGlobeRotate = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const globeRotate = useTransform([scrollGlobeRotate, time], ([r, t]) => r + (t / 50));
  
  const scrollGlobeScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.8, 0.8]);
  const globeScale = useTransform([scrollGlobeScale, time], ([s, t]) => s + Math.sin(t / 1500) * 0.03);
  
  const scrollGlobeX = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const scrollGlobeY = useTransform(scrollYProgress, [0, 1], [0, 300]);
  
  // Revolve in a circular motion when idle
  const globeX = useTransform([scrollGlobeX, time], ([x, t]) => x + Math.sin(t / 2000) * 20);
  const globeY = useTransform([scrollGlobeY, time], ([y, t]) => y + Math.cos(t / 2000) * 20);

  // Subtle mouse interaction (parallax)
  const mouseMoveX1 = useTransform(cursorX, (v) => v * -15);
  const mouseMoveY1 = useTransform(cursorY, (v) => v * -15);
  
  const mouseMoveX2 = useTransform(cursorX, (v) => v * 10);
  const mouseMoveY2 = useTransform(cursorY, (v) => v * 10);

  const mouseMoveX3 = useTransform(cursorX, (v) => v * -5);
  const mouseMoveY3 = useTransform(cursorY, (v) => v * -5);

  const globeParallaxX = useTransform(cursorX, (v) => v * 15);
  const globeParallaxY = useTransform(cursorY, (v) => v * 15);

  // Generate dense layers of elegant sweeping curves algorithmically
  const group1Lines = Array.from({ length: 9 }).map((_, i) => (
    <path 
      key={`g1-${i}`}
      d={`M-200,${500 + i * 40} C${200 + i * 25},${350 + i * 25} ${500 + i * 45},${850 - i * 15} 1600,${150 + i * 50}`} 
      fill="none" 
      stroke="url(#line-grad-1)" 
      strokeWidth={Math.max(1, 4 - (i * 0.25))} 
      strokeOpacity={Math.max(0.1, 0.7 - (i * 0.07))} 
    />
  ));

  const group2Lines = Array.from({ length: 9 }).map((_, i) => (
    <path 
      key={`g2-${i}`}
      d={`M1600,${650 + i * 45} C${1300 - i * 35},${950 + i * 35} ${700 - i * 25},${150 - i * 25} -200,${350 + i * 55}`} 
      fill="none" 
      stroke="url(#line-grad-2)" 
      strokeWidth={Math.max(1, 3.5 - (i * 0.2))} 
      strokeOpacity={Math.max(0.1, 0.6 - (i * 0.06))} 
    />
  ));

  const group3Lines = Array.from({ length: 9 }).map((_, i) => (
    <path 
      key={`g3-${i}`}
      d={`M-200,${50 + i * 40} C${450 + i * 25},${350 + i * 35} ${950 - i * 35},${-150 - i * 15} 1600,${250 + i * 30}`} 
      fill="none" 
      stroke="url(#line-grad-3)" 
      strokeWidth={Math.max(1, 4.5 - (i * 0.3))} 
      strokeOpacity={Math.max(0.1, 0.5 - (i * 0.05))} 
    />
  ));

  // Globe Wireframe generation
  const R = 350; // Radius of the globe
  const CX = 1100;
  const CY = 350;
  
  // Latitude ellipses (horizontal)
  const latitudes = Array.from({ length: 10 }).map((_, i) => {
    const ratio = (i + 1) / 11;
    return (
      <ellipse 
        key={`lat-${i}`} 
        cx={CX} cy={CY} 
        rx={R} ry={R * ratio} 
        fill="none" 
        stroke="url(#globe-grad)" 
        strokeWidth={2} 
        strokeOpacity={0.6} 
      />
    );
  });

  // Longitude ellipses (vertical)
  const longitudes = Array.from({ length: 10 }).map((_, i) => {
    const ratio = (i + 1) / 11;
    return (
      <ellipse 
        key={`lon-${i}`} 
        cx={CX} cy={CY} 
        rx={R * ratio} ry={R} 
        fill="none" 
        stroke="url(#globe-grad)" 
        strokeWidth={2} 
        strokeOpacity={0.6} 
      />
    );
  });

  return (
    <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none bg-[#f5f3ec] dark:bg-[#111111]">
      {/* Particles Effect */}
      <div className="absolute inset-0 z-0 opacity-50 dark:opacity-100">
        <Particles
          particleColors={['#0d9488', '#38bdf8', '#0ea5e9']}
          particleCount={150}
          particleSpread={20}
          speed={0.03}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={true}
          pixelRatio={1}
        />
      </div>

      <svg 
        className="absolute inset-0 w-full h-full opacity-60 dark:opacity-30 z-10" 
        preserveAspectRatio="none" 
        viewBox="0 0 1440 800" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="line-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="line-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="line-grad-3" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="globe-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <motion.g style={{ scale: scale1, rotate: rotate1, x: mouseMoveX1, y: mouseMoveY1 }} transformOrigin="50% 50%">
          {group1Lines}
        </motion.g>

        <motion.g style={{ scale: scale2, rotate: rotate2, x: mouseMoveX2, y: mouseMoveY2 }} transformOrigin="50% 50%">
          {group2Lines}
        </motion.g>

        <motion.g style={{ scale: scale3, rotate: rotate3, x: mouseMoveX3, y: mouseMoveY3 }} transformOrigin="50% 50%">
          {group3Lines}
        </motion.g>

        {/* Structural Grid Globe */}
        <motion.g 
          style={{ 
            scale: globeScale, 
            rotate: globeRotate, 
            x: globeX, 
            y: globeY,
            translateX: globeParallaxX,
            translateY: globeParallaxY
          }} 
          transformOrigin={`${CX}px ${CY}px`}
        >
          {/* Outer circle of the globe */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="url(#globe-grad)" strokeWidth={3} strokeOpacity={0.8} />
          
          {latitudes}
          {longitudes}
          
          {/* Diagonal axes to give it an architectural blueprint feel */}
          <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="url(#globe-grad)" strokeWidth={2.5} strokeOpacity={0.6} strokeDasharray="6 6" />
          <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="url(#globe-grad)" strokeWidth={2.5} strokeOpacity={0.6} strokeDasharray="6 6" />
        </motion.g>
      </svg>
      
      <div className="absolute -left-[10vw] -top-[10vh] h-[40vw] w-[40vw] rounded-full bg-teal-100/40 blur-[100px] dark:bg-teal-900/10 mix-blend-multiply dark:mix-blend-screen" />
      <div className="absolute right-[5vw] top-[20vh] h-[30vw] w-[30vw] rounded-full bg-sky-100/40 blur-[120px] dark:bg-indigo-900/10 mix-blend-multiply dark:mix-blend-screen" />
    </div>
  );
}
