import axios from "axios";
import { weatherCache } from "./cache.js";

async function geocodeOpenMeteo(name) {
  const q = String(name || "").trim();
  if (!q) return null;
  const res = await axios.get(
    "https://geocoding-api.open-meteo.com/v1/search",
    {
      params: { name: q, count: 1, language: "de", format: "json" },
      timeout: 8000,
      validateStatus: () => true,
    },
  );
  if (res.status >= 400) return null;
  const hit = res.data?.results?.[0];
  if (!hit) return null;
  return {
    name: hit.name,
    admin1: hit.admin1 || null,
    country: hit.country || null,
    latitude: hit.latitude,
    longitude: hit.longitude,
    source: "open-meteo",
  };
}

async function geocodeNominatim(text) {
  const q = String(text || "").trim();
  if (!q) return null;
  const res = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: {
      format: "jsonv2",
      q,
      limit: 1,
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
  if (res.status >= 400) return null;
  const it = res.data?.[0];
  if (!it) return null;
  const addr = it.address || {};
  const name =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.hamlet ||
    it.name ||
    it.display_name;
  return {
    name,
    admin1: addr.state || addr.region || null,
    country: addr.country || null,
    latitude: Number(it.lat),
    longitude: Number(it.lon),
    source: "nominatim",
  };
}

// Ort → Koordinaten → aktuelle Wetterwerte
export async function getWeatherForLocation(locationRaw) {
  const location = String(locationRaw || "").trim();
  if (!location) {
    const err = new Error("location erforderlich");
    err.status = 400;
    throw err;
  }

  const cacheKey = `weather:${location.toLowerCase()}`;
  const cached = weatherCache.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  let place = await geocodeOpenMeteo(location);
  if (!place) {
    const nameOnly = location.split(",")[0]?.trim();
    if (nameOnly?.length >= 2) place = await geocodeOpenMeteo(nameOnly);
  }
  if (!place) place = await geocodeNominatim(location);
  if (!place) {
    const nameOnly = location.split(",")[0]?.trim();
    if (nameOnly?.length >= 2) place = await geocodeNominatim(nameOnly);
  }
  if (!place) {
    const err = new Error(`Ort nicht gefunden: "${location}"`);
    err.status = 404;
    throw err;
  }

  const wx = await axios.get("https://api.open-meteo.com/v1/forecast", {
    params: {
      latitude: place.latitude,
      longitude: place.longitude,
      current: [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "wind_speed_10m",
        "wind_gusts_10m",
        "precipitation",
        "cloud_cover",
        "weather_code",
      ].join(","),
      wind_speed_unit: "kmh",
      timezone: "auto",
    },
    timeout: 8000,
  });

  const payload = {
    query: location,
    resolved: {
      name: place.name,
      admin1: place.admin1,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
      source: place.source,
    },
    current: wx.data?.current || null,
    current_units: wx.data?.current_units || null,
    cached: false,
  };
  weatherCache.set(cacheKey, payload);
  return payload;
}
