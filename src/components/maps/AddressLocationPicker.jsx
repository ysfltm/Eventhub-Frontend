import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Navigation, Search, RefreshCw, CheckCircle2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  autocompleteAddress,
  geocodeAddress,
  reverseGeocodeCoords,
  getGeoapifyTileUrl,
} from '../../utils/geoapifyUtils';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

// Custom Pin Icon for Location Picker
const createPickerPinIcon = () =>
  L.divIcon({
    className: 'picker-leaflet-marker',
    html: `<div style="
      background-color: #B51F24;
      width: 34px;
      height: 34px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #ffffff;
      box-shadow: 0 10px 25px rgba(181, 31, 36, 0.45);
      cursor: grab;
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
  });

// Map Click Event Listener component
const MapClickHandler = ({ onLocationSelected }) => {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Map Recenter Helper component
const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 15, { animate: true });
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [center, map]);
  return null;
};

export const AddressLocationPicker = ({
  value = '',
  onChange,
  placeholder = 'Search address or click on map to pick location...',
  className = '',
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [coords, setCoords] = useState({ lat: 37.7749, lng: -122.4194 }); // Default SF
  const [loading, setLoading] = useState(false);
  const [geolocating, setGeolocating] = useState(false);

  const markerRef = useRef(null);

  // Sync internal input value if prop changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Initial geocoding when component mounts or value set
  useEffect(() => {
    if (value && value.trim()) {
      geocodeAddress(value).then((res) => {
        if (res && res.lat && res.lng) {
          setCoords({ lat: res.lat, lng: res.lng });
        }
      });
    }
  }, [value]);

  // Handle live autocomplete suggestions as user types
  const handleInputChange = async (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);

    if (val.trim().length >= 2) {
      const results = await autocompleteAddress(val);
      setSuggestions(results);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Select suggestion from dropdown
  const handleSelectSuggestion = (sug) => {
    setQuery(sug.formatted);
    onChange(sug.formatted);
    setCoords({ lat: sug.lat, lng: sug.lng });
    setShowSuggestions(false);
  };

  // Handle map click or marker drag ➔ Reverse Geocoding
  const handleLocationPicked = useCallback(
    async (lat, lng) => {
      setLoading(true);
      setCoords({ lat, lng });

      const res = await reverseGeocodeCoords(lat, lng);
      if (res && res.formatted) {
        setQuery(res.formatted);
        onChange(res.formatted);
      }
      setLoading(false);
    },
    [onChange]
  );

  // Handle Marker Drag End
  const handleMarkerDragEnd = useCallback(() => {
    const marker = markerRef.current;
    if (marker != null) {
      const { lat, lng } = marker.getLatLng();
      handleLocationPicked(lat, lng);
    }
  }, [handleLocationPicked]);

  // Handle Geolocation Action: "Use My Current Location"
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await handleLocationPicked(latitude, longitude);
        setGeolocating(false);
      },
      (err) => {
        alert(`Failed to retrieve current location: ${err.message}`);
        setGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Input Bar with Autocomplete & Geolocation Button */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => query.trim().length >= 2 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={placeholder}
              className="pl-10 text-xs font-medium bg-[var(--bg-input)] border-[var(--border-default)] rounded-2xl"
            />
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />

            {loading && (
              <RefreshCw className="w-3.5 h-3.5 text-[var(--cst-blue-400)] animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleUseCurrentLocation}
            disabled={geolocating}
            className="cst-btn-motion text-xs font-bold py-2.5 px-3 rounded-2xl bg-[var(--surface-800)] hover:bg-[var(--surface-700)] text-[var(--text-primary)] border border-[var(--border-default)] shrink-0 flex items-center gap-1.5 cursor-pointer"
            title="Locate via device GPS"
          >
            {geolocating ? (
              <RefreshCw className="w-3.5 h-3.5 text-[var(--cst-blue-400)] animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
            )}
            <span className="hidden sm:inline">Use My Location</span>
          </Button>
        </div>

        {/* Autocomplete Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--surface-900)] border border-[var(--border-default)] rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-[var(--border-subtle)]">
            {suggestions.map((sug) => (
              <div
                key={sug.id}
                onMouseDown={() => handleSelectSuggestion(sug)}
                className="p-2.5 px-4 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-800)] transition-colors cursor-pointer flex items-center gap-2"
              >
                <MapPin className="w-3.5 h-3.5 text-[var(--cst-red-400)] shrink-0" />
                <span className="truncate">{sug.formatted}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Embedded Leaflet Location Picker Map */}
      <div className="relative w-full h-[220px] bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-inner">
        <MapContainer
          center={[coords.lat, coords.lng]}
          zoom={15}
          scrollWheelZoom={true}
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.geoapify.com/" target="_blank">Geoapify</a>'
            url={getGeoapifyTileUrl()}
          />
          <MapRecenter center={[coords.lat, coords.lng]} />
          <MapClickHandler onLocationSelected={handleLocationPicked} />

          <Marker
            draggable={true}
            eventHandlers={{ dragend: handleMarkerDragEnd }}
            position={[coords.lat, coords.lng]}
            ref={markerRef}
            icon={createPickerPinIcon()}
          />
        </MapContainer>

        <div className="absolute bottom-2 right-2 z-10 bg-[var(--surface-900)]/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-[var(--border-default)] text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1 shadow-md">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Click map or drag marker to set address</span>
        </div>
      </div>
    </div>
  );
};

export default AddressLocationPicker;
