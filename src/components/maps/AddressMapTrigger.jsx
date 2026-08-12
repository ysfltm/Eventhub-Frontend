import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { MapModal } from './MapModal';
import { resolveHumanAddress, isNumericCoordinates } from '../../utils/geoapifyUtils';

/**
 * AddressMapTrigger Component
 * Renders an interactive address trigger element with pin icon, hover highlight, and cursor-pointer.
 * Automatically resolves raw numeric coordinates (e.g. "37.77485, -122.42339") into full written street addresses.
 * On click: Opens the Geoapify interactive MapModal.
 */
export const AddressMapTrigger = ({
  address,
  label,
  className = '',
  iconClassName = 'w-4 h-4 text-[var(--cst-red-400)]',
  showIcon = true,
  children,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [humanAddress, setHumanAddress] = useState(label || address);

  useEffect(() => {
    let isMounted = true;
    if (address && isNumericCoordinates(address)) {
      resolveHumanAddress(address).then((resolved) => {
        if (isMounted) setHumanAddress(resolved);
      });
    } else {
      setHumanAddress(label || address);
    }
    return () => {
      isMounted = false;
    };
  }, [address, label]);

  if (!address) return null;

  const displayText = children || humanAddress;

  return (
    <>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 cursor-pointer group/map hover:text-[var(--cst-blue-400)] transition-colors ${className}`}
        title={`View '${humanAddress}' on Geoapify Map`}
      >
        {showIcon && <MapPin className={`shrink-0 group-hover/map:scale-110 transition-transform ${iconClassName}`} />}
        <span className="underline decoration-dotted underline-offset-4 group-hover/map:decoration-solid group-hover/map:text-[var(--cst-blue-400)] truncate">
          {displayText}
        </span>
      </div>

      <MapModal
        address={humanAddress || address}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default AddressMapTrigger;
