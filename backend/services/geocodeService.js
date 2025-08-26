import axios from "axios";
import { weatherCache } from "./cache.js";

// extrahiert Stadtnamen aus OSM-Adresse
function pickOsmName(addr = {}, fallback = "") {
  return (
    addr.city || addr.town || addr.village || addr.hamlet || fallback || null
  );
}

function normalize({ name, admin1, country, latitude, longitude }) {
  if (!name || typeof latitude !== "number" || typeof longitude !== "number")
    return null;
  return {
    name,
    admin1: admin1 || null,
    country: country || null,
    latitude,
    longitude,
    population: null,
    source: "nominatim",
  };
}

// Reverse-Geocoding über Nominatim
export async function reverseGeocodeNearestCity(lat, lon) {
  const la = Number(lat),
    lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) {
    const err = new Error("lat/lon ungültig");
    err.status = 400;
    throw err;
  }
  const cacheKey = `rev:nominatim:${la.toFixed(3)},${lo.toFixed(3)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  const res = await axios.get("https://nominatim.openstreetmap.org/reverse", {
    params: {
      format: "jsonv2",
      lat: la,
      lon: lo,
      zoom: 10,
      addressdetails: 1,
      "accept-language": "de",
    },
    headers: {
      "User-Agent":
        process.env.NOMINATIM_UA ||
        "WeatherApp/0.1 (dev; contact: you@example.com)",
    },
    timeout: 8000,
    validateStatus: () => true,
  });

  if (res.status >= 500) {
    const err = new Error("Reverse-Geocoding nicht erreichbar");
    err.status = 502;
    throw err;
  }

  const addr = res.data?.address || {};
  const name = pickOsmName(addr, res.data?.name);
  const out = normalize({
    name,
    admin1: addr.state || addr.region,
    country: addr.country,
    latitude: Number(res.data?.lat),
    longitude: Number(res.data?.lon),
  });

  if (!out) {
    const err = new Error("Kein Ort in der Nähe gefunden");
    err.status = 404;
    throw err;
  }

  weatherCache.set(cacheKey, out);
  return { ...out, cached: false };
}

// Textsuche → Vorschläge
export async function searchPlaces(q) {
  const query = String(q || "").trim();
  if (query.length < 2) return [];

  const key = `sug:nominatim:${query.toLowerCase()}`;
  const cached = weatherCache.get(key);
  if (cached) return cached;

  const res = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: {
      format: "jsonv2",
      q: query,
      limit: 8,
      addressdetails: 1,
      "accept-language": "de",
    },
    headers: {
      "User-Agent":
        process.env.NOMINATIM_UA ||
        "WeatherApp/0.1 (dev; contact: you@example.com)",
    },
    timeout: 8000,
    validateStatus: () => true,
  });
  if (res.status >= 500) return [];

  const items = (res.data || [])
    .map((it) => {
      const addr = it.address || {};
      const name =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.hamlet ||
        it.name ||
        it.display_name;
      const admin1 = addr.state || addr.region || null;
      const country = addr.country || null;
      const lat = Number(it.lat),
        lon = Number(it.lon);
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const label = `${name}${admin1 ? `, ${admin1}` : ""}${country ? `, ${country}` : ""}`;
      return {
        label,
        name,
        admin1,
        country,
        latitude: lat,
        longitude: lon,
        source: "nominatim",
      };
    })
    .filter(Boolean);

  weatherCache.set(key, items);
  return items;
}
