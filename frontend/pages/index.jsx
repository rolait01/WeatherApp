import { useEffect, useState } from "react";
import Globe from "../components/Globe";
import WeatherWidget from "../components/WeatherWidget";
import ThemeToggle from "../components/ThemeToggle";
import useIsMobile from "../utils/useIsMobile";
import useDebounce from "../utils/useDebounce";
import {
  listWidgets,
  createWidget,
  deleteWidget,
  reverseGeocode,
  suggestPlaces,
} from "../utils/api";
import g from "../styles/globe.module.css";

export default function Home() {
  const isMobile = useIsMobile(900);

  // Suche / Vorschläge
  const [query, setQuery] = useState("");
  const [suggest, setSuggest] = useState([]);
  const [active, setActive] = useState(-1);
  const [pickedSuggestion, setPickedSuggestion] = useState(null);
  const debounced = useDebounce(query, 250);

  // Globus-Auswahl
  const [picked, setPicked] = useState(null); // { lat, lng }
  const [resolving, setResolving] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [revErr, setRevErr] = useState("");

  // Widgets
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("location");

  // initial Widgets laden
  useEffect(() => {
    (async () => {
      setErr("");
      try {
        setWidgets(await listWidgets());
      } catch (e) {
        setErr(e.message || "Fehler beim Laden");
      }
    })();
  }, []);

  // Vorschläge laden (debounced)
  useEffect(() => {
    (async () => {
      setPickedSuggestion(null);
      setActive(-1);
      const q = debounced.trim();
      if (q.length < 2) {
        setSuggest([]);
        return;
      }
      try {
        setSuggest(await suggestPlaces(q));
      } catch {
        setSuggest([]);
      }
    })();
  }, [debounced]);

  async function refreshWidgets() {
    setErr("");
    try {
      setWidgets(await listWidgets());
    } catch (e) {
      setErr(e.message || "Fehler beim Laden");
    }
  }

  // Duplikate blocken
  const existsLabel = (label) =>
    widgets.some(
      (w) =>
        w.location.trim().toLowerCase() ===
        String(label || "")
          .trim()
          .toLowerCase(),
    );

  async function onCreateFromText(sel) {
    if (!sel) return;
    const label = String(sel.label || "").trim();
    if (existsLabel(label)) {
      setErr("Widget existiert bereits");
      return;
    }
    try {
      setLoading(true);
      setErr("");
      await createWidget(label);
      setQuery("");
      setSuggest([]);
      setPickedSuggestion(null);
      setActive(-1);
      await refreshWidgets();
      if (isMobile) setTab("weather");
    } catch (e) {
      setErr(e.message || "Fehler beim Erstellen");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id) {
    setErr("");
    try {
      await deleteWidget(id);
      await refreshWidgets();
    } catch (e) {
      setErr(e.message || "Fehler beim Löschen");
    }
  }

  const overlayOpen = !!(picked || resolving || revErr || candidate);

  const LocationPane = (
    <>
      <form
        className="suggest-wrap"
        style={{ marginBottom: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          onCreateFromText(pickedSuggestion ?? suggest[0] ?? null);
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            placeholder="Ort suchen (mind. 2 Zeichen)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (suggest.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, suggest.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const sel = active >= 0 ? suggest[active] : suggest[0];
                if (sel) onCreateFromText(sel);
              }
            }}
          />
          <button
            className="btn"
            type="submit"
            disabled={loading || (!pickedSuggestion && suggest.length === 0)}
          >
            Hinzufügen
          </button>
        </div>

        {suggest.length > 0 && (
          <div className="suggest-list">
            {suggest.map((s, idx) => (
              <div
                key={s.label + idx}
                className={`suggest-item${idx === active ? " active" : ""}`}
                onMouseEnter={() => setActive(idx)}
                onMouseLeave={() => setActive(-1)}
                onClick={() => {
                  setPickedSuggestion(s);
                  setQuery(s.label);
                  setSuggest([]);
                }}
              >
                {s.label}
              </div>
            ))}
          </div>
        )}

        {debounced.trim().length >= 2 && suggest.length === 0 && (
          <div className="suggest-list">
            <div className="suggest-empty">Keine Treffer</div>
          </div>
        )}
      </form>

      <div className={`${g.container} ${overlayOpen ? g.hasOverlay : ""}`}>
        <Globe
          onPick={async ({ lat, lng }) => {
            setPicked({ lat, lng });
            setCandidate(null);
            setRevErr("");
            try {
              setResolving(true);
              const place = await reverseGeocode(lat, lng);
              setCandidate(place);
            } catch (e) {
              setRevErr(e.message || "Reverse-Geocoding fehlgeschlagen");
            } finally {
              setResolving(false);
            }
          }}
        />

        {overlayOpen && (
          <div className={g.overlay}>
            <div className={g.card}>
              {/* Status: Suchen */}
              {resolving && (
                <div className={g.title}>Suche nächstgelegene Stadt …</div>
              )}

              {/* Status: Fehlermeldung */}
              {!resolving && revErr && (
                <>
                  <div className={g.title} style={{ color: "#ffb8b8" }}>
                    {revErr}
                  </div>
                  <div className={g.meta}>
                    lat {picked?.lat.toFixed(3)}, lon {picked?.lng.toFixed(3)}
                  </div>
                  <div className={g.actions}>
                    <button
                      className="btn"
                      onClick={() => {
                        setPicked(null);
                        setRevErr("");
                      }}
                    >
                      Schließen
                    </button>
                  </div>
                </>
              )}

              {/* Status: Treffer */}
              {!resolving && candidate && (
                <>
                  <div className={g.title}>
                    {candidate.name}
                    {candidate.admin1 ? `, ${candidate.admin1}` : ""}
                    {candidate.country ? `, ${candidate.country}` : ""}
                  </div>
                  <div className={g.meta}>
                    lat {candidate.latitude.toFixed(3)}, lon{" "}
                    {candidate.longitude.toFixed(3)}
                  </div>
                  <div className={g.actions}>
                    <button
                      className={`btn ${g.primary}`}
                      onClick={async () => {
                        const label =
                          `${candidate.name}` +
                          (candidate.admin1 ? `, ${candidate.admin1}` : "") +
                          (candidate.country ? `, ${candidate.country}` : "");
                        if (existsLabel(label)) {
                          setErr("Widget existiert bereits");
                          return;
                        }
                        try {
                          await createWidget(label);
                          await refreshWidgets();
                          if (isMobile) setTab("weather");
                          setCandidate(null);
                          setPicked(null);
                        } catch (e) {
                          setErr(e.message || "Fehler beim Erstellen");
                        }
                      }}
                    >
                      Als Widget speichern
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        setCandidate(null);
                        setPicked(null);
                      }}
                    >
                      Abbrechen
                    </button>
                  </div>
                </>
              )}

              {/* Status: nur Pick ohne Ergebnis/Fehler */}
              {!resolving && !candidate && !revErr && picked && (
                <>
                  <div className={g.title}>Auswahl</div>
                  <div className={g.meta}>
                    lat {picked.lat.toFixed(3)}, lon {picked.lng.toFixed(3)}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );

  const WeatherPane = (
    <>
      {err && (
        <div className="pill" style={{ color: "inherit" }}>
          {err}
        </div>
      )}
      <div className="widgets-grid">
        {widgets.map((w) => (
          <WeatherWidget key={w._id} widget={w} onDelete={onDelete} />
        ))}
      </div>
      {widgets.length === 0 && (
        <div style={{ opacity: 0.75, marginTop: 8 }}>
          Noch keine Widgets – links einen Ort hinzufügen.
        </div>
      )}
    </>
  );

  return (
    <main>
      <header className="header">
        <div className="brand">
          <h1 style={{ margin: 0, fontSize: 24 }}>WeatherApp</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isMobile && (
            <>
              <button
                className="btn"
                onClick={() => setTab("location")}
                style={{
                  background:
                    tab === "location"
                      ? "rgba(255,255,255,0.12)"
                      : "transparent",
                }}
              >
                Location
              </button>
              <button
                className="btn"
                onClick={() => setTab("weather")}
                style={{
                  background:
                    tab === "weather"
                      ? "rgba(255,255,255,0.12)"
                      : "transparent",
                }}
              >
                Weather
              </button>
            </>
          )}
          <ThemeToggle />
        </div>
      </header>

      {isMobile ? (
        tab === "location" ? (
          LocationPane
        ) : (
          WeatherPane
        )
      ) : (
        <div className="grid-60-40">
          <div className="panel">{LocationPane}</div>
          <aside className="panel">
            <h2 style={{ margin: "4px 0 12px", fontSize: 18, fontWeight: 600 }}>
              Widgets
            </h2>
            {WeatherPane}
          </aside>
        </div>
      )}
    </main>
  );
}
