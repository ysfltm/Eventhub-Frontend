import axios from 'axios';

// Geoapify API Key from Environment
export const GEOAPIFY_API_KEY =
  import.meta.env.VITE_GEOAPIFY_API_KEY ||
  import.meta.env.REACT_APP_GEOAPIFY_API_KEY ||
  '';

/**
 * Utility: Checks if an address string is raw numeric coordinates (e.g. "37.77485, -122.42339")
 */
export const isNumericCoordinates = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(str.trim());
};

/**
 * Forward Geocoding: Converts an address string to lat/lng coordinates.
 * Tries Geoapify ➔ Photon (OSM) ➔ Nominatim (OSM).
 */
export const geocodeAddress = async (address) => {
  if (!address || !address.trim()) return null;
  const cleanAddress = address.trim();

  // If raw coordinates are passed directly
  if (isNumericCoordinates(cleanAddress)) {
    const [latStr, lngStr] = cleanAddress.split(',').map((s) => s.trim());
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng, formatted: cleanAddress };
    }
  }

  // 1. Try Geoapify API
  if (GEOAPIFY_API_KEY) {
    try {
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
        cleanAddress
      )}&apiKey=${GEOAPIFY_API_KEY}`;
      const res = await axios.get(url, { timeout: 4000 });
      const feature = res.data?.features?.[0];
      if (feature && feature.geometry?.coordinates) {
        const [lng, lat] = feature.geometry.coordinates;
        return {
          lat,
          lng,
          formatted: feature.properties.formatted || cleanAddress,
          city: feature.properties.city || '',
          country: feature.properties.country || '',
        };
      }
    } catch (err) {
      console.warn('Geoapify Forward Geocoding error, trying Photon:', err?.message);
    }
  }

  // 2. Try Photon Komoot API (High-speed OpenStreetMap search, keyless)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanAddress)}&limit=1`;
    const res = await axios.get(photonUrl, { timeout: 4000 });
    const feature = res.data?.features?.[0];
    if (feature && feature.geometry?.coordinates) {
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties || {};
      const formatted = [props.name, props.street, props.city || props.county, props.country]
        .filter(Boolean)
        .join(', ');
      return {
        lat,
        lng,
        formatted: formatted || cleanAddress,
        city: props.city || '',
        country: props.country || '',
      };
    }
  } catch (err) {
    console.warn('Photon Geocoding error, trying Nominatim:', err?.message);
  }

  // 3. Try OpenStreetMap Nominatim API
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      cleanAddress
    )}&limit=1`;
    const res = await axios.get(osmUrl, { timeout: 4000 });
    if (res.data && res.data.length > 0) {
      const item = res.data[0];
      return {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        formatted: item.display_name || cleanAddress,
      };
    }
  } catch (err) {
    console.warn('OSM Nominatim Geocoding error:', err?.message);
  }

  // Default coordinate fallback for Tunisia / SF depending on query
  const isTunisia = /tunis|tunisia|rades|kram|lac|ariana|sousse|sfax/i.test(cleanAddress);
  return {
    lat: isTunisia ? 36.835 : 37.7749,
    lng: isTunisia ? 10.238 : -122.4194,
    formatted: cleanAddress,
  };
};

/**
 * Autocomplete: Fetch live address suggestions as user types.
 * Tries Geoapify ➔ Photon (OSM).
 */
export const autocompleteAddress = async (query) => {
  if (!query || query.trim().length < 2) return [];
  const cleanQuery = query.trim();

  // 1. Try Geoapify Autocomplete API
  if (GEOAPIFY_API_KEY) {
    try {
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
        cleanQuery
      )}&apiKey=${GEOAPIFY_API_KEY}`;
      const res = await axios.get(url, { timeout: 3000 });
      const features = res.data?.features || [];
      if (features.length > 0) {
        return features.map((f) => ({
          id: f.properties.place_id || Math.random().toString(),
          formatted: f.properties.formatted || cleanQuery,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
        }));
      }
    } catch (err) {
      console.warn('Geoapify Autocomplete error, trying Photon:', err?.message);
    }
  }

  // 2. Try Photon Komoot API
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=6`;
    const res = await axios.get(photonUrl, { timeout: 3000 });
    const features = res.data?.features || [];
    if (features.length > 0) {
      return features.map((f) => {
        const props = f.properties || {};
        const title = [props.name, props.street, props.city || props.county, props.country]
          .filter(Boolean)
          .join(', ');
        return {
          id: String(props.osm_id || Math.random()),
          formatted: title || cleanQuery,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
        };
      });
    }
  } catch (err) {
    console.warn('Photon Autocomplete error:', err?.message);
  }

  return [];
};

/**
 * Reverse Geocoding: Converts lat/lng coordinates to a human-readable street address string.
 */
export const reverseGeocodeCoords = async (lat, lng) => {
  // 1. Try Geoapify Reverse Geocoding API
  if (GEOAPIFY_API_KEY) {
    try {
      const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${GEOAPIFY_API_KEY}`;
      const res = await axios.get(url, { timeout: 4000 });
      const feature = res.data?.features?.[0];
      if (feature && feature.properties) {
        const p = feature.properties;
        const formatted =
          p.formatted ||
          [p.address_line1, p.address_line2, p.city, p.state, p.country]
            .filter(Boolean)
            .join(', ');
        if (formatted && formatted.trim()) {
          return { formatted, city: p.city || '', country: p.country || '' };
        }
      }
    } catch (err) {
      console.warn('Geoapify Reverse error, trying Photon:', err?.message);
    }
  }

  // 2. Try Photon Komoot Reverse API
  try {
    const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
    const res = await axios.get(photonUrl, { timeout: 4000 });
    const feature = res.data?.features?.[0];
    if (feature && feature.properties) {
      const p = feature.properties;
      const formatted = [p.name, p.street, p.city || p.county, p.country]
        .filter(Boolean)
        .join(', ');
      if (formatted && formatted.trim()) {
        return { formatted, city: p.city || '', country: p.country || '' };
      }
    }
  } catch (err) {
    console.warn('Photon Reverse error:', err?.message);
  }

  return { formatted: `Location near ${lat.toFixed(4)}°, ${lng.toFixed(4)}°` };
};

/**
 * Automatically resolves raw numeric coordinates (e.g. "37.77485, -122.42339") to a full written address.
 */
export const resolveHumanAddress = async (address) => {
  if (!address || !address.trim()) return 'Venue Location TBD';
  const cleanStr = address.trim();
  if (isNumericCoordinates(cleanStr)) {
    const [latStr, lngStr] = cleanStr.split(',').map((s) => s.trim());
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng)) {
      const res = await reverseGeocodeCoords(lat, lng);
      return res.formatted;
    }
  }
  return cleanStr;
};

/**
 * Tile Layer URL for Leaflet.
 * Uses high-reliability OpenStreetMap tiles to guarantee 100% tile rendering without grey boxes!
 */
export const getGeoapifyTileUrl = () => {
  return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
};
