import React, { useRef, useEffect } from 'react';

export default function Particles({
  particleColors = ['#ffffff'],
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleBaseSize = 100,
  moveParticlesOnHover = true,
  alphaParticles = true,
  disableRotation = true,
  pixelRatio = 1,
  className = ""
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    
    let animationFrameId;
    let width = 0;
    let height = 0;
    let particles = [];
    
    // Mouse state
    let mouse = { x: -1000, y: -1000, radius: 150 };

    const handleMouseMove = (e) => {
      if (!moveParticlesOnHover) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    if (moveParticlesOnHover) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseout', handleMouseLeave);
    }

    const init = () => {
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(pixelRatio, pixelRatio);
      
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        const color = particleColors[Math.floor(Math.random() * particleColors.length)];
        const size = (Math.random() * (particleBaseSize / 25)) + 0.5;
        const x = Math.random() * width;
        const y = Math.random() * height;
        const speedX = (Math.random() - 0.5) * speed * 15;
        const speedY = (Math.random() - 0.5) * speed * 15;
        const alpha = alphaParticles ? Math.random() * 0.7 + 0.1 : 1;
        particles.push({ x, y, size, speedX, speedY, color, alpha });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        
        // Movement
        p.x += p.speedX;
        p.y += p.speedY;
        
        // Wrapping
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        
        // Hover interaction
        if (moveParticlesOnHover) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < mouse.radius) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius;
            const directionX = forceDirectionX * force * particleSpread * 0.2;
            const directionY = forceDirectionY * force * particleSpread * 0.2;
            
            p.x -= directionX;
            p.y -= directionY;
          }
        }
        
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (disableRotation) {
           ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        } else {
           ctx.rect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        }
        ctx.fill();
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleResize = () => {
      init();
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (moveParticlesOnHover) {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseout', handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [particleColors, particleCount, particleSpread, speed, particleBaseSize, moveParticlesOnHover, alphaParticles, disableRotation, pixelRatio]);

  return <canvas ref={canvasRef} className={`absolute inset-0 pointer-events-none ${className}`} />;
}
