import { useState, useCallback } from 'react';

/**
 * Custom hook to manage ripple clicks on any element without altering DOM layout structure.
 */
export const useRippleClick = () => {
  const [ripples, setRipples] = useState([]);

  const handleContainerClick = useCallback((e) => {
    // Ignore clicks on interactive UI elements (buttons, inputs, links, etc.)
    const isInteractive = e.target.closest('button, input, a, select, textarea, label, [role="button"]');
    if (isInteractive) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = `${Date.now()}-${Math.random()}`;

    setRipples((prev) => [...prev, { id, x, y }]);

    // Auto-clean ripple node after 800ms animation finishes
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 800);
  }, []);

  return { ripples, handleContainerClick };
};

export default useRippleClick;
