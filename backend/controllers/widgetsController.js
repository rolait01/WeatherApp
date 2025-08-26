import Widget from "../models/Widget.js";
import { getWeatherForLocation } from "../services/weatherService.js";
import {
  reverseGeocodeNearestCity,
  searchPlaces,
} from "../services/geocodeService.js";

export async function listWidgets(_req, res, next) {
  try {
    res.json(await Widget.find().sort({ createdAt: -1 }).lean());
  } catch (e) {
    next(e);
  }
}

export async function createWidget(req, res, next) {
  try {
    const location = String(req.body?.location || "").trim();
    if (!location)
      return res.status(400).json({ error: "location erforderlich" });
    const exists = await Widget.findOne({
      location_norm: location.toLowerCase(),
    }).lean();
    if (exists)
      return res.status(409).json({ error: "Widget existiert bereits" });
    const doc = await Widget.create({ location });
    res.status(201).json(doc);
  } catch (e) {
    if (e?.code === 11000)
      return res.status(409).json({ error: "Widget existiert bereits" });
    next(e);
  }
}

export async function deleteWidget(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await Widget.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "nicht gefunden" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function weatherByQuery(req, res) {
  try {
    const { location } = req.query || {};
    const data = await getWeatherForLocation(location);
    res.json(data);
  } catch (e) {
    res
      .status(e.status || 500)
      .json({ error: e.message || "Fehler beim Wetterabruf" });
  }
}

export async function reverseByCoords(req, res) {
  try {
    const { lat, lon } = req.query || {};
    const data = await reverseGeocodeNearestCity(lat, lon);
    res.json(data);
  } catch (e) {
    const status = e.status || 500;
    const msg =
      status === 404
        ? "Kein Ort in der Nähe gefunden – bitte näher an eine Stadt klicken."
        : "Reverse-Geocoding fehlgeschlagen";
    res.status(status).json({ error: msg });
  }
}

export async function suggestByText(req, res) {
  try {
    const { q } = req.query || {};
    res.json(await searchPlaces(q));
  } catch {
    res.status(500).json({ error: "Suche fehlgeschlagen" });
  }
}
