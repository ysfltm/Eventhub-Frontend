import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, ExternalLink, Navigation, AlertCircle, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { geocodeAddress, getGeoapifyTileUrl } from '../../utils/geoapifyUtils';

// Custom Leaflet Pin Icon using inline SVG & CST Blue styling
const createCustomPinIcon = () =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="
      background-color: #1D56B6;
      width: 34px;
      height: 34px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #ffffff;
      box-shadow: 0 10px 25px rgba(29, 86, 182, 0.45);
    ">
      <div style="
        width: 10px;
        height: 10px;
        background-color: #ffffff;
        border-radius: 50%;
      "></div>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });

// Component to dynamically re-center map & trigger size invalidation on render
const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.setView([center.lat, center.lng], 15, { animate: true });
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [center, map]);
  return null;
};

export const MapModal = ({ address, isOpen, onClose }) => {
  // Default coordinates (Tunis / North Africa tech hub) while resolving
  const [coords, setCoords] = useState({ lat: 36.835, lng: 10.238, formatted: address });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isOpen || !address) return;
    let isMounted = true;
    setLoading(true);
    setError(false);

    geocodeAddress(address).then((res) => {
      if (!isMounted) return;
      if (res && res.lat && res.lng) {
        setCoords(res);
        setError(false);
      } else {
        setError(true);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, address]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const googleSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;
  const googleDirUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address || '')}`;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative max-w-2xl w-full bg-[var(--surface-900)] border border-[var(--border-default)] rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Top Header */}
          <div className="p-4 md:px-6 bg-[var(--surface-900)] border-b border-[var(--border-default)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[var(--cst-blue-800)]/20 border border-[var(--cst-blue-600)]/30 rounded-2xl text-[var(--cst-blue-400)] shrink-0">
                <MapPin className="w-5 h-5 text-[var(--cst-blue-400)]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--cst-blue-400)] block">
                  Geoapify Interactive Location
                </span>
                <h3 className="text-base font-black text-[var(--text-primary)] truncate max-w-md">
                  {address || 'Venue Location'}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-800)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Map Content Body - Fixed 380px Height */}
          <div className="relative w-full h-[380px] min-h-[380px] bg-[var(--surface-850)] shrink-0 overflow-hidden">
            {/* Top Loading indicator floating badge */}
            {loading && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-[var(--surface-900)]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[var(--border-default)] text-xs text-[var(--cst-blue-400)] font-semibold flex items-center gap-2 shadow-lg">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--cst-blue-400)]" />
                <span>Geocoding address with Geoapify API...</span>
              </div>
            )}

            {/* Always Rendered Leaflet Interactive Map */}
            <MapContainer
              center={[coords.lat, coords.lng]}
              zoom={15}
              scrollWheelZoom={true}
              className="w-full h-full z-0"
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url={getGeoapifyTileUrl()}
              />
              <MapRecenter center={coords} />
              <Marker position={[coords.lat, coords.lng]} icon={createCustomPinIcon()}>
                <Popup className="custom-leaflet-popup">
                  <div className="p-1 font-sans text-xs">
                    <strong className="block text-[var(--cst-blue-600)] mb-1">Venue Location</strong>
                    <span>{coords.formatted || address}</span>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>

            {/* Error / Approximate Location Banner */}
            {error && !loading && (
              <div className="absolute top-3 left-3 right-3 z-10 bg-amber-950/90 border border-amber-800/60 rounded-2xl p-3 text-xs text-amber-300 flex items-center gap-2 backdrop-blur-md shadow-lg">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Exact building match not found. Showing approximate city/region map area.</span>
              </div>
            )}
          </div>

          {/* Modal Footer Controls - ALWAYS VISIBLE BUTTONS */}
          <div className="p-4 md:px-6 bg-[var(--surface-900)] border-t border-[var(--border-default)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-[11px] font-mono text-[var(--text-muted)] truncate max-w-xs">
              {coords ? `${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°` : 'Resolving coordinates...'}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <a
                href={googleDirUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cst-btn-motion flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white text-xs font-bold py-2.5 px-4 rounded-2xl shadow-md cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Get Directions</span>
              </a>

              <a
                href={googleSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cst-btn-motion flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-[var(--surface-800)] hover:bg-[var(--surface-700)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-bold py-2.5 px-4 rounded-2xl cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
                <span>Open in Google Maps</span>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default MapModal;
