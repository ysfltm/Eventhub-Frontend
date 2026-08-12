import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRippleClick } from '../../hooks/useRippleClick';

/**
 * RippleLayer Component
 * Rendered inside a position: relative container to display water-droplet ripples.
 */
export const RippleLayer = ({ ripples }) => {
  if (!ripples || ripples.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <AnimatePresence>
        {ripples.map((ripple) => (
          <React.Fragment key={ripple.id}>
            {/* Primary Ripple Wave */}
            <motion.div
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 4.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                left: ripple.x - 40,
                top: ripple.y - 40,
                width: 80,
                height: 80,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(29,86,182,0.25) 0%, rgba(25,121,200,0.12) 40%, rgba(255,255,255,0.05) 70%, transparent 100%)',
                border: '1.5px solid rgba(106, 171, 223, 0.35)',
                boxShadow: '0 0 25px rgba(25, 121, 200, 0.25)',
                backdropFilter: 'blur(2px)',
              }}
            />
            {/* Secondary Echo Pulse */}
            <motion.div
              initial={{ scale: 0, opacity: 0.4 }}
              animate={{ scale: 2.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.08 }}
              style={{
                position: 'absolute',
                left: ripple.x - 25,
                top: ripple.y - 25,
                width: 50,
                height: 50,
                borderRadius: '50%',
                border: '1px solid rgba(255, 255, 255, 0.4)',
              }}
            />
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  );
};

/**
 * RippleBackground Wrapper Component
 */
export const RippleBackground = ({ children, className = '', style = {} }) => {
  const { ripples, handleContainerClick } = useRippleClick();

  return (
    <div
      onClick={handleContainerClick}
      style={{ position: 'relative', width: '100%', minHeight: '100vh', ...style }}
      className={className}
    >
      <RippleLayer ripples={ripples} />
      {children}
    </div>
  );
};

export default RippleBackground;
