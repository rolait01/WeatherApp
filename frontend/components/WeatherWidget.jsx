import { useEffect, useMemo, useRef, useState } from "react";
import { getWeather } from "../utils/api";

const WMO = [
  { codes: [0], text: "Klar" },
  { codes: [1, 2, 3], text: "Wolkig" },
  { codes: [45, 48], text: "Nebel" },
  { codes: [51, 53, 55], text: "Niesel" },
  { codes: [61, 63, 65], text: "Regen" },
  { codes: [66, 67], text: "gefrierender Regen" },
  { codes: [71, 73, 75], text: "Schnee" },
  { codes: [77], text: "Schneekörner" },
  { codes: [80, 81, 82], text: "Regenschauer" },
  { codes: [85, 86], text: "Schneeschauer" },
  { codes: [95], text: "Gewitter" },
  { codes: [96, 99], text: "Gewitter mit Hagel" },
];
const wmoText = (code) =>
  WMO.find((g) => g.codes.includes(Number(code)))?.text || "—";

function fm(v, u) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const num = typeof v === "number" ? v : Number(v);
  return `${Math.round(num * 10) / 10}${u || ""}`;
}

/* Temperatur → HSL-Gradient, Sättigung nach oben; Deckkraft per CSS-Var --widget-tint */
function gradientForTemp(t) {
  if (t === null || t === undefined || Number.isNaN(t)) return null;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const norm = clamp((t - -10) / (35 - -10), 0, 1);
  const hue = 220 - Math.pow(norm, 0.85) * 210; // etwas kurvig für mehr Punch an den Enden
  const l1 = 56 - norm * 8;
  const l2 = 44 - norm * 6;
  const c1 = `hsl(${hue} 96% ${l1}% / var(--widget-tint))`;
  const c2 = `hsl(${hue} 92% ${l2}% / calc(var(--widget-tint) * 0.7))`;
  return `linear-gradient(145deg, ${c1}, ${c2}), var(--card)`;
}

const Icon = {
  wind: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M4 12h9a3 3 0 1 0-3-3" />
      <path fill="currentColor" d="M2 17h13a3 3 0 1 1-3 3" />
    </svg>
  ),
  temp: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14 14.76V5a2 2 0 1 0-4 0v9.76a4 4 0 1 0 4 0Z"
      />
    </svg>
  ),
};

export default function WeatherWidget({ widget, onDelete }) {
  const [data, setData] = useState(null);
  const [units, setUnits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [lastTs, setLastTs] = useState(null);
  const inFlight = useRef(false);

  // Initialer Abruf
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const res = await getWeather(widget.location);
        if (!alive) return;
        setData(res.current || null);
        setUnits(res.current_units || null);
        setLastTs(Date.now());
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Wetterabruf fehlgeschlagen");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [widget.location]);

  // Live-Refresh alle 20s, solange „Details“ offen ist und Tab sichtbar ist
  useEffect(() => {
    if (!open) return;
    let alive = true;

    const tick = async () => {
      if (!alive) return;
      if (document.visibilityState === "hidden") return;
      if (inFlight.current) return;
      try {
        inFlight.current = true;
        const res = await getWeather(widget.location);
        if (!alive) return;
        setData(res.current || null);
        setUnits(res.current_units || null);
        setLastTs(Date.now());
      } catch (e) {
        if (!alive) return;
      } finally {
        inFlight.current = false;
      }
    };

    const id = setInterval(tick, 20000);
    // Optional: ersten Tick nicht sofort, wir haben ja initiale Daten
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [open, widget.location]);

  const bg = useMemo(
    () => gradientForTemp(data?.temperature_2m ?? null),
    [data],
  );
  const t = data?.temperature_2m;
  const w = data?.wind_speed_10m;
  const code = data?.weather_code;

  return (
    <div className="widget-card" style={{ background: bg }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <strong style={{ fontSize: 16 }}>{widget.location}</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn"
            onClick={() => setOpen((o) => !o)}
            style={{ padding: "6px 10px" }}
          >
            {open ? "Weniger" : "Details"}
          </button>
          <button
            className="btn"
            onClick={() => onDelete(widget._id)}
            style={{ padding: "6px 10px" }}
          >
            Löschen
          </button>
        </div>
      </div>

      {loading && <div style={{ opacity: 0.75, marginTop: 10 }}>lädt…</div>}
      {err && <div style={{ color: "#ff9f9f", marginTop: 10 }}>{err}</div>}

      {!loading && !err && data && (
        <>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div className="chip" title="Temperatur">
              <Icon.temp />
              &nbsp;{fm(t, units?.temperature_2m)}
            </div>
            <div className="chip" title="Wetterlage">
              {wmoText(code)}
            </div>
            <div className="chip" title="Wind">
              {/* Icon ohne nbsp, hält die Zeile ruhig */}
              <Icon.wind /> {fm(w, ` ${units?.wind_speed_10m || "m/s"}`)}
            </div>
          </div>

          {open && (
            <div className="meta-grid" style={{ marginTop: 12 }}>
              <div>
                <span>Gefühlt</span>
                <b>
                  {fm(data.apparent_temperature, units?.apparent_temperature)}
                </b>
              </div>
              <div>
                <span>Feuchte</span>
                <b>
                  {fm(data.relative_humidity_2m, units?.relative_humidity_2m)}
                </b>
              </div>
              <div>
                <span>Niederschlag</span>
                <b>{fm(data.precipitation, units?.precipitation)}</b>
              </div>
              <div>
                <span>Bewölkung</span>
                <b>{fm(data.cloud_cover, units?.cloud_cover)}</b>
              </div>
              <div>
                <span>Böen</span>
                <b>{fm(data.wind_gusts_10m, units?.wind_gusts_10m)}</b>
              </div>
            </div>
          )}

          {/* kleine Statuszeile: wann zuletzt aktualisiert */}
          {lastTs && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              aktualisiert: {new Date(lastTs).toLocaleTimeString()}
              {open ? " • Live (20s)" : ""}
            </div>
          )}
        </>
      )}
    </div>
  );
}
