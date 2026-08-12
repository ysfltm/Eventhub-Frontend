import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * MagneticIcon Component
 * Draws icons, role badges, and action buttons toward the cursor on hover with magnetic spring dynamics.
 * Max translation: ±12px. Spring physics: stiffness 150, damping 15.
 */
export const MagneticIcon = ({
  children,
  className = '',
  maxShift = 10,
  scaleOnHover = 1.12,
  onClick,
  ...props
}) => {
  const ref = useRef(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 150, damping: 15 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const distanceX = (e.clientX - centerX) * 0.35;
    const distanceY = (e.clientY - centerY) * 0.35;

    // Constrain to maxShift
    const clampedX = Math.max(-maxShift, Math.min(maxShift, distanceX));
    const clampedY = Math.max(-maxShift, Math.min(maxShift, distanceY));

    x.set(clampedX);
    y.set(clampedY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        x: springX,
        y: springY,
      }}
      whileHover={{ scale: scaleOnHover }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex items-center justify-center will-change-transform cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default MagneticIcon;
