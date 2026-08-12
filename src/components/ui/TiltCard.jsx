import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * TiltCard Component
 * Implements a smooth 3D tilt / magnetic effect that follows cursor coordinates
 * Restrained to +/-5 deg rotation so inputs and forms remain clear and easy to type in.
 */
export const TiltCard = ({ children, className = '', style = {}, showTopGradient = true }) => {
  const cardRef = useRef(null);

  // Motion values for normalized mouse offset [-0.5, 0.5]
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth physics spring configuration
  const springConfig = { damping: 25, stiffness: 200, mass: 0.5 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  // Map mouse offset to balanced rotation [-7deg, 7deg] across all 4 corners
  const rotateX = useTransform(springY, [-0.5, 0.5], [7, -7]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-7, 7]);

  // Subtle highlight position
  const glossX = useTransform(springX, [-0.5, 0.5], ['0%', '100%']);
  const glossY = useTransform(springY, [-0.5, 0.5], ['0%', '100%']);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate mouse position relative to center of card [-0.5, 0.5]
    const mouseX = (e.clientX - rect.left) / width - 0.5;
    const mouseY = (e.clientY - rect.top) / height - 0.5;

    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000,
        ...style,
      }}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Outer Top Border Gradient Stripe (Blue to Red) */}
      {showTopGradient && (
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-[inherit] bg-gradient-to-r from-[var(--cst-blue-600)] to-[var(--cst-red-600)] z-20 pointer-events-none" />
      )}

      {children}

      {/* Subtle dynamic gloss overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-25"
        style={{
          background: useTransform(
            [glossX, glossY],
            ([gx, gy]) =>
              `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.15) 0%, transparent 70%)`
          ),
        }}
      />
    </motion.div>
  );
};

export default TiltCard;
