const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export async function listWidgets() {
  const r = await fetch(`${BASE}/widgets`, { cache: "no-store" });
  if (!r.ok) throw new Error("Fehler beim Laden der Widgets");
  return r.json();
}
export async function createWidget(location) {
  const r = await fetch(`${BASE}/widgets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location }),
  });
  if (!r.ok) {
    const m = await r.json().catch(() => ({}));
    throw new Error(m?.error || "Fehler beim Erstellen");
  }
  return r.json();
}
export async function deleteWidget(id) {
  const r = await fetch(`${BASE}/widgets/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Fehler beim Löschen");
  return r.json();
}
export async function reverseGeocode(lat, lon) {
  const url = new URL(`${BASE}/widgets/reverse`);
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    const m = await r.json().catch(() => ({}));
    throw new Error(m?.error || "Reverse-Geocoding fehlgeschlagen");
  }
  return r.json();
}
export async function suggestPlaces(query) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const url = new URL(`${BASE}/widgets/suggest`);
  url.searchParams.set("q", q);
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return [];
  return r.json();
}
export async function getWeather(location) {
  const url = new URL(`${BASE}/widgets/weather`);
  url.searchParams.set("location", location);
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    const m = await r.json().catch(() => ({}));
    throw new Error(m?.error || "Wetterabruf fehlgeschlagen");
  }
  return r.json();
}
