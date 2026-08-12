import React, { useRef, useState } from 'react';

/**
 * InteractiveTableRow Component
 * On hover: Renders a smooth cursor-following radial spotlight across the row.
 * Prevents layout shifts or table jittering.
 */
export const InteractiveTableRow = ({
  children,
  className = '',
  spotlightColor = 'rgba(29, 86, 182, 0.12)',
  ...props
}) => {
  const rowRef = useRef(null);
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50, isHovered: false });

  const handleMouseMove = (e) => {
    if (!rowRef.current) return;
    const rect = rowRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCursorPos({ x, y, isHovered: true });
  };

  const handleMouseLeave = () => {
    setCursorPos((prev) => ({ ...prev, isHovered: false }));
  };

  return (
    <tr
      ref={rowRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative transition-colors duration-200 cursor-pointer ${className}`}
      style={{
        backgroundImage: cursorPos.isHovered
          ? `radial-gradient(350px circle at ${cursorPos.x}% ${cursorPos.y}%, ${spotlightColor}, transparent 80%)`
          : 'none',
      }}
      {...props}
    >
      {children}
    </tr>
  );
};

export default InteractiveTableRow;
