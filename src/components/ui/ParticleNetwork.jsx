import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * ParticleNetwork
 * ─────────────────────────────────────────────────────────────────────────────
 * Enterprise background animation canvas rendering floating network particles
 * connected by lines representing corporate networking & event connections.
 *
 * Performance Features:
 *  - Native 2D Canvas with requestAnimationFrame
 *  - Low particle density (~45 nodes desktop, ~20 mobile)
 *  - 5–8% low opacity to preserve accessibility & contrast
 *  - Respects prefers-reduced-motion
 *  - Mouse interaction for gentle node attraction
 *  - Adapts to light and dark theme modes
 */
const ParticleNetwork = () => {
  const canvasRef = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    // 1. Check prefers-reduced-motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isMobile = width < 768;
    const particleCount = isMobile ? 22 : 48;
    const maxDistance = isMobile ? 100 : 130;
    const mouseRadius = 140;

    const mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // CST Color palette for nodes
    // Blue: 85%, Red: 15%
    const blueColor = isDark ? '29, 86, 182' : '25, 121, 200';
    const redColor = isDark ? '181, 31, 36' : '217, 43, 43';

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.45;
        this.vy = (Math.random() - 0.5) * 0.45;
        this.radius = Math.random() * 1.6 + 1.2;
        this.isRed = Math.random() < 0.15; // 15% CST Red accent
      }

      update() {
        // Move
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Gentle mouse attraction
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouseRadius && dist > 0) {
          const force = (mouseRadius - dist) / mouseRadius;
          this.x += (dx / dist) * force * 0.6;
          this.y += (dy / dist) * force * 0.6;
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        const rgb = this.isRed ? redColor : blueColor;
        ctx.fillStyle = `rgba(${rgb}, ${this.isRed ? 0.35 : 0.25})`;
        ctx.fill();
      }
    }

    const particles = Array.from({ length: particleCount }, () => new Particle());

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * (isDark ? 0.08 : 0.06);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p1.isRed || p2.isRed
              ? `rgba(${redColor}, ${alpha * 1.2})`
              : `rgba(${blueColor}, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Update & draw particles
      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: isDark ? 0.85 : 0.65,
        transition: 'opacity 300ms ease',
      }}
    />
  );
};

export default ParticleNetwork;
