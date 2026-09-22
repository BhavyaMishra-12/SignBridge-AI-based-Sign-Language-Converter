(function() {
  const bgContainer = document.createElement('div');
  bgContainer.className = "fixed inset-0 -z-20 overflow-hidden pointer-events-none bg-[#f5f3ec] dark:bg-[#111111]";
  
  let g1Lines = "", g2Lines = "", g3Lines = "";
  for (let i = 0; i < 9; i++) {
    g1Lines += `<path d="M-200,${500 + i * 40} C${200 + i * 25},${350 + i * 25} ${500 + i * 45},${850 - i * 15} 1600,${150 + i * 50}" fill="none" stroke="url(#line-grad-1)" stroke-width="${Math.max(1, 4 - (i * 0.25))}" stroke-opacity="${Math.max(0.1, 0.7 - (i * 0.07))}" />`;
    g2Lines += `<path d="M1600,${650 + i * 45} C${1300 - i * 35},${950 + i * 35} ${700 - i * 25},${150 - i * 25} -200,${350 + i * 55}" fill="none" stroke="url(#line-grad-2)" stroke-width="${Math.max(1, 3.5 - (i * 0.2))}" stroke-opacity="${Math.max(0.1, 0.6 - (i * 0.06))}" />`;
    g3Lines += `<path d="M-200,${50 + i * 40} C${450 + i * 25},${350 + i * 35} ${950 - i * 35},${-150 - i * 15} 1600,${250 + i * 30}" fill="none" stroke="url(#line-grad-3)" stroke-width="${Math.max(1, 4.5 - (i * 0.3))}" stroke-opacity="${Math.max(0.1, 0.5 - (i * 0.05))}" />`;
  }

  const R = 350, CX = 1100, CY = 350;
  let latLines = "", lonLines = "";
  for (let i = 0; i < 10; i++) {
    const ratio = (i + 1) / 11;
    latLines += `<ellipse cx="${CX}" cy="${CY}" rx="${R}" ry="${R * ratio}" fill="none" stroke="url(#globe-grad)" stroke-width="2" stroke-opacity="0.6" />`;
    lonLines += `<ellipse cx="${CX}" cy="${CY}" rx="${R * ratio}" ry="${R}" fill="none" stroke="url(#globe-grad)" stroke-width="2" stroke-opacity="0.6" />`;
  }

  bgContainer.innerHTML = `
    <canvas id="bg-particles" class="absolute inset-0 z-0 opacity-50 dark:opacity-100 pointer-events-none"></canvas>
    <svg class="absolute inset-0 w-full h-full opacity-60 dark:opacity-30 z-10 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1440 800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="line-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0d9488" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1" />
        </linearGradient>
        <linearGradient id="line-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.6" />
          <stop offset="100%" stop-color="#14b8a6" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="line-grad-3" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="#94a3b8" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#cbd5e1" stop-opacity="0.1" />
        </linearGradient>
        <linearGradient id="globe-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284c7" stop-opacity="0.7" />
          <stop offset="100%" stop-color="#0f766e" stop-opacity="0.2" />
        </linearGradient>
      </defs>
      <g id="bg-g1" style="transform-origin: 50% 50%">${g1Lines}</g>
      <g id="bg-g2" style="transform-origin: 50% 50%">${g2Lines}</g>
      <g id="bg-g3" style="transform-origin: 50% 50%">${g3Lines}</g>
      <g id="bg-globe" style="transform-origin: ${CX}px ${CY}px">
        <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="url(#globe-grad)" stroke-width="3" stroke-opacity="0.8" />
        ${latLines}${lonLines}
        <line x1="${CX - R}" y1="${CY}" x2="${CX + R}" y2="${CY}" stroke="url(#globe-grad)" stroke-width="2.5" stroke-opacity="0.6" stroke-dasharray="6 6" />
        <line x1="${CX}" y1="${CY - R}" x2="${CX}" y2="${CY + R}" stroke="url(#globe-grad)" stroke-width="2.5" stroke-opacity="0.6" stroke-dasharray="6 6" />
      </g>
    </svg>
    <div class="absolute -left-[10vw] -top-[10vh] h-[40vw] w-[40vw] rounded-full bg-teal-100/40 blur-[100px] dark:bg-teal-900/10 mix-blend-multiply dark:mix-blend-screen"></div>
    <div class="absolute right-[5vw] top-[20vh] h-[30vw] w-[30vw] rounded-full bg-sky-100/40 blur-[120px] dark:bg-indigo-900/10 mix-blend-multiply dark:mix-blend-screen"></div>
  `;
  document.body.prepend(bgContainer);

  const g1 = document.getElementById('bg-g1');
  const g2 = document.getElementById('bg-g2');
  const g3 = document.getElementById('bg-g3');
  const globe = document.getElementById('bg-globe');

  let mouseX = 0, mouseY = 0;
  let targetMouseX = 0, targetMouseY = 0;
  let scrollP = 0;

  window.addEventListener('pointermove', (e) => {
    targetMouseX = (e.clientX / window.innerWidth - 0.5) * 20;
    targetMouseY = (e.clientY / window.innerHeight - 0.5) * 20;
  });

  const lerp = (a, b, n) => (1 - n) * a + n * b;
  const map = (val, in_min, in_max, out_min, out_max) => (val - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  function loop(time = performance.now()) {
    // Spring physics approximation for cursor
    mouseX = lerp(mouseX, targetMouseX, 0.05);
    mouseY = lerp(mouseY, targetMouseY, 0.05);

    // Scroll progress (0 to 1) based on body scroll height
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const scrollY = window.scrollY;
    scrollP = clamp(scrollY / maxScroll, 0, 1);

    // G1 Math
    const s1 = map(scrollP, 0, 1, 1, 1.3) + Math.sin(time / 2000) * 0.02;
    const r1 = map(scrollP, 0, 1, 0, 15) + Math.sin(time / 3000) * 3;
    const mx1 = mouseX * -15, my1 = mouseY * -15;
    g1.style.transform = `translate(${mx1}px, ${my1}px) scale(${s1}) rotate(${r1}deg)`;

    // G2 Math
    const s2 = map(scrollP, 0, 1, 1.1, 0.9) + Math.cos(time / 2500) * 0.03;
    const r2 = map(scrollP, 0, 1, 0, -10) + Math.sin(time / 2000) * 2.5;
    const mx2 = mouseX * 10, my2 = mouseY * 10;
    g2.style.transform = `translate(${mx2}px, ${my2}px) scale(${s2}) rotate(${r2}deg)`;

    // G3 Math
    const s3 = map(scrollP, 0, 1, 0.9, 1.4) + Math.sin(time / 3500) * 0.02;
    const r3 = map(scrollP, 0, 1, -5, 5) + Math.cos(time / 2500) * 3;
    const mx3 = mouseX * -5, my3 = mouseY * -5;
    g3.style.transform = `translate(${mx3}px, ${my3}px) scale(${s3}) rotate(${r3}deg)`;

    // Globe Math (Idle rotation and revolving added)
    const gr = map(scrollP, 0, 1, 0, 180) + (time / 50);
    let gs = 1;
    if (scrollP <= 0.5) gs = map(scrollP, 0, 0.5, 1, 1.8);
    else gs = map(scrollP, 0.5, 1, 1.8, 0.8);
    gs += Math.sin(time / 1500) * 0.03;
    const gx = map(scrollP, 0, 1, 0, -200) + Math.sin(time / 2000) * 20;
    const gy = map(scrollP, 0, 1, 0, 300) + Math.cos(time / 2000) * 20;
    const gpx = mouseX * 15, gpy = mouseY * 15;
    globe.style.transform = `translate(${gx + gpx}px, ${gy + gpy}px) scale(${gs}) rotate(${gr}deg)`;

    requestAnimationFrame(loop);
  }
  
  loop();

  // Initialize Particles
  const canvas = document.getElementById('bg-particles');
  if (canvas) {
    const ctx = canvas.getContext('2d', { alpha: true });
    let pWidth = 0, pHeight = 0;
    let particles = [];
    const colors = ['#0d9488', '#38bdf8', '#0ea5e9'];
    const count = 150;
    
    // Use the existing mouseX and mouseY (which are mapped from targetMouseX) but we need raw screen coords
    let rawMouseX = -1000, rawMouseY = -1000;
    window.addEventListener('pointermove', (e) => {
      rawMouseX = e.clientX;
      rawMouseY = e.clientY;
    });

    const initParticles = () => {
      pWidth = window.innerWidth;
      pHeight = window.innerHeight;
      canvas.width = pWidth;
      canvas.height = pHeight;
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * pWidth,
          y: Math.random() * pHeight,
          size: (Math.random() * 2) + 0.5,
          speedX: (Math.random() - 0.5) * 0.4,
          speedY: (Math.random() - 0.5) * 0.4,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.7 + 0.1
        });
      }
    };

    const animateParticles = () => {
      ctx.clearRect(0, 0, pWidth, pHeight);
      for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        
        if (p.x < 0) p.x = pWidth;
        if (p.x > pWidth) p.x = 0;
        if (p.y < 0) p.y = pHeight;
        if (p.y > pHeight) p.y = 0;
        
        const dx = rawMouseX - p.x;
        const dy = rawMouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = (150 - dist) / 150;
          p.x -= (dx / dist) * force * 4;
          p.y -= (dy / dist) * force * 4;
        }
        
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(animateParticles);
    };

    window.addEventListener('resize', initParticles);
    initParticles();
    animateParticles();
  }
})();
