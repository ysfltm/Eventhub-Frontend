import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * ParallaxCard Component
 * Multi-layered depth parallax card:
 * Background shifts slightly AWAY from cursor (-6px).
 * Foreground logo & content shifts TOWARDS cursor (+10px).
 * Includes a top border gradient stripe flush along the outer top border edge.
 */
export const ParallaxCard = ({
  children,
  headerLogo,
  className = '',
  maxDepthShift = 10,
  showTopGradient = true,
  onClick,
  ...props
}) => {
  const ref = useRef(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { stiffness: 150, damping: 15 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  // Background shifts opposite (-depth)
  const bgX = useTransform(springX, [-0.5, 0.5], [maxDepthShift * 0.5, -maxDepthShift * 0.5]);
  const bgY = useTransform(springY, [-0.5, 0.5], [maxDepthShift * 0.5, -maxDepthShift * 0.5]);

  // Foreground logo shifts toward (+depth)
  const fgX = useTransform(springX, [-0.5, 0.5], [-maxDepthShift, maxDepthShift]);
  const fgY = useTransform(springY, [-0.5, 0.5], [-maxDepthShift, maxDepthShift]);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`group relative overflow-hidden transition-all duration-300 will-change-transform ${className}`}
      {...props}
    >
      {/* Outer Top Border Gradient Stripe */}
      {showTopGradient && (
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-[23px] bg-gradient-to-r from-[var(--cst-blue-600)] to-[var(--cst-red-600)] z-20 pointer-events-none" />
      )}

      {/* Background Layer: shifts slightly away */}
      <motion.div
        style={{ x: bgX, y: bgY }}
        className="pointer-events-none absolute -inset-2 bg-gradient-to-br from-[var(--cst-blue-900)]/20 via-transparent to-[var(--cst-red-900)]/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[inherit]"
      />

      {/* Foreground Layer: Logo & Text shifts toward cursor */}
      <motion.div style={{ x: fgX, y: fgY }} className="relative z-10 w-full h-full">
        {headerLogo && <div className="mb-4">{headerLogo}</div>}
        {children}
      </motion.div>
    </motion.div>
  );
};

export default ParallaxCard;
