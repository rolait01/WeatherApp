# WeatherApp

Ein kleines Full‑Stack‑Projekt (Next.js + Node.js/Express + MongoDB), das Wetter‑Widgets für frei wählbare Orte bereitstellt. Orte können über eine interaktive 3D‑Erdkugel oder über Textsuche ausgewählt werden. Widgets zeigen die wichtigsten aktuellen Wetterdaten an und lassen sich für Details aufklappen. Geöffnete Widgets werden alle 20 Sekunden aktualisiert.

---

## Inhalt

- [Ziele](#ziele)
- [Funktionsumfang](#funktionsumfang)
- [Technischer Stack](#technischer-stack)
- [Architektur](#architektur)
- [Projektstruktur](#projektstruktur)
- [Schnellstart](#schnellstart)
  - [Voraussetzungen](#voraussetzungen)
  - [Umgebungsvariablen](#umgebungsvariablen)
  - [Backend starten](#backend-starten)
  - [Frontend starten](#frontend-starten)
- [API-Referenz (Backend)](#api-referenz-backend)
  - [/health](#get-health)
  - [/widgets](#get-widgets--post-widgets--delete-widgetsid)
  - [/geo/suggest](#get-geosuggest)
  - [/geo/reverse](#get-georeverse)
  - [/weather](#get-weather)
- [Wetterdaten & Caching](#wetterdaten--caching)
- [Geokodierung & Richtlinien](#geokodierung--richtlinien)
- [Frontend-Details](#frontend-details)
- [Entwicklung & Qualität](#entwicklung--qualität)
- [Deployment-Hinweise](#deployment-hinweise)
- [Troubleshooting](#troubleshooting)
- [Lizenz](#lizenz)

---

## Ziele

- Verständnis für sauberes API‑Design und Trennung von Frontend/Backend
- Integration externer APIs (Open‑Meteo für Wetter, Nominatim/OpenStreetMap für Geokodierung)
- Caching‑Strategien im Backend
- Ein modernes, responsives UI mit interaktiver 3D‑Globus‑Interaktion

## Funktionsumfang

- Auswahl von Orten über:
  - 3D‑Globus (Klick → nächstgelegene Stadt)
  - Textsuche mit Vorschlägen (Autosuggest, nur gültige Treffer)
- Widgets anlegen/löschen (MongoDB persistiert `location` + Metadaten)
- Wetterdaten: kompakter Überblick (Temperatur, Wetterlage, Wind), aufklappbar für Details
- Visuelle Temperatur‑Einfärbung pro Widget (Gradient, Intensität via `--widget-tint` steuerbar)
- Auto‑Refresh: geöffnete Widgets aktualisieren sich alle 20 Sekunden
- Kein Login erforderlich

## Technischer Stack

- **Frontend:** Next.js 14, React, `react-globe.gl` (Three.js‑basierte Globus‑Komponente), CSS (keine UI‑Lib)
- **Backend:** Node.js (Express/Fastify‑Stil mit Express), Axios/Fetch für externe APIs
- **Datenbank:** MongoDB (lokal oder Atlas)
- **Externe APIs:**
  - Open‑Meteo (Wetter + Geocoding)
  - Nominatim/OpenStreetMap (Reverse‑Geocoding und Vorschläge)
- **Caching:** In‑Memory‑Cache im Backend (konfigurierbare TTL)

## Architektur

```
Frontend (Next.js)
 ├─ Globe (react-globe.gl)  ──► Klick: {lat,lng}
 │                             ▼
 │                        /geo/reverse  (Backend → Nominatim)
 │                             ▼
 │                         Ortnamen-Vorschlag
 │                             ▼
 │  Sucheingabe ────────► /geo/suggest  (Autosuggest)
 │                             ▼
 │  Widget anlegen ─────► POST /widgets  (MongoDB speichert label)
 │                             ▼
 │  Widget anzeigen ───► GET /weather?location=... (Backend:
 │                        Open‑Meteo Geocoding → Weather API, Cache)
 │                             ▼
 │  Details offen ─────► Poll alle 20 s (nur sichtbare, geöffnete Widgets)
 │
 └─ Widgets löschen ───► DELETE /widgets/:id

Backend (Express)
 ├─ /widgets       (CRUD)
 ├─ /weather       (Open‑Meteo + Cache)
 └─ /geo/*         (Nominatim Proxy: suggest + reverse)
```

## Projektstruktur

```
/project-root
├── backend/                      # Node.js Backend (Express)
│   ├── controllers/
│   │   └── widgetsController.js
│   ├── models/
│   │   └── Widget.js
│   ├── routes/
│   │   └── widgets.js            # bindet auch /geo/*, /weather, /health ein
│   ├── services/
│   │   ├── weatherService.js     # Open‑Meteo + Caching
│   │   ├── geocodeService.js     # Nominatim proxy (suggest/reverse)
│   │   └── cache.js              # einfacher In‑Memory‑Cache
│   ├── db.js
│   ├── server.js
│   ├── .env                      # lokale Variablen (nicht committen)
│   └── .gitignore
├── frontend/                     # Next.js Frontend
│   ├── components/
│   │   ├── Globe.jsx
│   │   ├── ThemeToggle.jsx
│   │   └── WeatherWidget.jsx
│   ├── pages/
│   │   ├── _app.js
│   │   └── index.jsx
│   ├── styles/
│   │   ├── global.css
│   │   └── globe.module.css
│   └── utils/
│       ├── api.js
│       ├── useDebounce.js
│       └── useIsMobile.js
└── README.md
```

## Schnellstart

### Voraussetzungen

- Node.js 18+
- MongoDB lokal (Standardport 27017) oder MongoDB Atlas
- Git, cURL bzw. PowerShell

### Umgebungsvariablen

`backend/.env` (Beispiel):

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/widgets
CACHE_TTL_SECONDS=300
CORS_ORIGIN=http://localhost:3000

# Für Nominatim bitte mit eigener Kennung & Kontaktadresse
APP_USER_AGENT=WeatherApp/0.1 (+you@example.com)
```

Hinweise:
- `APP_USER_AGENT` ist für Nominatim verpflichtend. Verwenden Sie eine echte Kontaktadresse.
- `CACHE_TTL_SECONDS` steuert die serverseitige Wetter‑Cache‑Dauer.

### Backend starten

```bash
cd backend
npm install
npm run dev
```

Der Server läuft standardmäßig unter `http://localhost:5000`.

Health‑Check (PowerShell):
```powershell
Invoke-RestMethod http://localhost:5000/health
```

### Frontend starten

```bash
cd frontend
npm install
npm run dev
```

Das Frontend läuft unter `http://localhost:3000`.

## API-Referenz (Backend)

### GET /health

Einfacher Health‑Check.

**Beispiel:**
```powershell
Invoke-RestMethod http://localhost:5000/health
```

### GET /widgets  |  POST /widgets  |  DELETE /widgets/:id

- `GET /widgets` – Liste aller gespeicherten Widgets.
- `POST /widgets` – Neues Widget anlegen.
  - Body (JSON): `{ "location": "Berlin, Germany" }`
  - Duplikate werden im Frontend abgefangen und sollten im Backend ebenfalls verhindert werden.
- `DELETE /widgets/:id` – Widget löschen.

**PowerShell:**
```powershell
# Anlegen
$body = @{ location = "Berlin, Germany" } | ConvertTo-Json
Invoke-RestMethod http://localhost:5000/widgets -Method Post -Headers @{ "Content-Type" = "application/json" } -Body $body

# Liste
Invoke-RestMethod http://localhost:5000/widgets

# Löschen
Invoke-RestMethod http://localhost:5000/widgets/<ID> -Method Delete
```

### GET /geo/suggest

Forward‑Geocoding (Proxy auf Nominatim), liefert Vorschläge für die Suchbox.

**Query‑Parameter:**
- `q` (string, erforderlich): Suchbegriff
- `limit` (optional, Default: 5)

**Beispiel:**
```
GET /geo/suggest?q=Stutt&limit=5
```

**Antwort (Beispiel):**
```json
[
  { "label": "Stuttgart, Baden-Württemberg, Deutschland", "lat": 48.778, "lon": 9.180 },
  { "label": "Stutensee, Baden-Württemberg, Deutschland", "lat": 49.071, "lon": 8.490 }
]
```

### GET /geo/reverse

Reverse‑Geocoding (Proxy auf Nominatim), ordnet Klick auf Globus der nächstgelegenen Stadt zu.

**Query‑Parameter:**
- `lat` (float, erforderlich)
- `lon` (float, erforderlich)

**Beispiel:**
```
GET /geo/reverse?lat=48.78&lon=9.18
```

**Antwort (Beispiel):**
```json
{
  "name": "Stuttgart",
  "admin1": "Baden-Württemberg",
  "country": "Deutschland",
  "latitude": 48.778,
  "longitude": 9.18
}
```

### GET /weather

Kapselt Open‑Meteo (Geocoding + Wetter). Rückgabe enthält aktuelle Werte und Einheiten.

**Query‑Parameter:**
- `location` (string, erforderlich) – z. B. `"Berlin, Germany"`

**Beispiel:**
```
GET /weather?location=Berlin, Germany
```

**Antwort (gekürzt):**
```json
{
  "current": {
    "time": "2025-08-26T15:00",
    "temperature_2m": 24.3,
    "apparent_temperature": 25.0,
    "relative_humidity_2m": 56,
    "precipitation": 0.0,
    "cloud_cover": 40,
    "wind_speed_10m": 3.8,
    "wind_gusts_10m": 6.2,
    "weather_code": 3
  },
  "current_units": {
    "temperature_2m": "°C",
    "apparent_temperature": "°C",
    "relative_humidity_2m": "%",
    "precipitation": "mm",
    "cloud_cover": "%",
    "wind_speed_10m": "m/s",
    "wind_gusts_10m": "m/s"
  }
}
```

## Wetterdaten & Caching

- Das Backend cached Wetterantworten pro normalisiertem Ort für `CACHE_TTL_SECONDS` (Default 300 s).
- Open‑Meteo bietet für viele Orte minütliche/viertelstündliche Aktualität. Der Cache reduziert externe Abrufe.
- Das Frontend pollt nur geöffnete Widgets (Details‑Ansicht) alle 20 Sekunden. Während der TTL liefert das Backend gecachte Werte.

Anpassungen:
- Kürzere TTL für nahezu Live‑Werte
- Längere TTL zur Lastreduktion
- „force“‑Bypass könnte ergänzt werden, ist aber standardmäßig nicht aktiv

## Geokodierung & Richtlinien

- Vorschläge und Reverse‑Geocoding laufen über **Nominatim** (OpenStreetMap).
- Richtlinien beachten:
  - Eigener, aussagekräftiger `User-Agent` mit Kontaktadresse (`APP_USER_AGENT`).
  - Keine aggressiven Abfragefrequenzen. Die Frontend‑Suche ist auf 250 ms debounced; bei Bedarf serverseitig zusätzlich drosseln.
  - Ergebnisse cachen, soweit sinnvoll.
- Für reine Geocoding‑Suche kann alternativ Open‑Meteo Geocoding genutzt werden, für „nächstgelegene Stadt“ liefert Nominatim in der Regel robustere Treffer.

## Frontend-Details

- Globus: `react-globe.gl` mit transparentem Hintergrund, klickbar; unsere Styles sind kapsuliert in `styles/globe.module.css`.
- Karte unter dem Globus: als Overlay‑Bottom‑Sheet, zentriert, ohne den Globus zu blockieren.
- Widgets:
  - Kompaktansicht: Temperatur, Wetterlage, Wind
  - Details: 3–5 weitere Werte (gefühlt, Feuchte, Niederschlag, Bewölkung, Böen)
  - Temperatur‑Gradient: per HSL gefärbt, Intensität über CSS‑Variable `--widget-tint` (Dark/Light‑Modus getrennt).
- Responsive:
  - Desktop: linke Spalte (Globus/Suche), rechte Spalte (Widgets). Entkoppelte Höhen, rechte Spalte scrollt separat.
  - Mobile: Tabs bzw. Bottom‑Sheet‑Overlay für die Auswahlkarte; große Tap‑Targets.

## Entwicklung & Qualität

- Node 18+ empfohlen.
- Empfohlene NPM‑Scripts (falls nicht vorhanden, ergänzen):
  - Backend: `dev` (nodemon), `start`
  - Frontend: `dev`, `build`, `start`
- Code‑Formatierung mit Prettier optional:
  ```bash
  npx prettier --write .
  ```
- `.gitignore` enthält: `node_modules/`, Build‑Artefakte (`.next/`), `.env*`, IDE‑Ordner (`.idea/`, `.vscode/`).

## Deployment-Hinweise

- **Frontend (Next.js):**
  ```bash
  cd frontend
  npm run build
  npm run start   # PORT=3000
  ```
- **Backend (Node/Express):**
  ```bash
  cd backend
  npm ci
  node server.js
  # oder mit pm2:
  pm2 start server.js --name weatherapp-api
  ```
- **CORS:** `CORS_ORIGIN` im Backend auf die produktive Frontend‑URL setzen.
- **MongoDB:** Produktions‑Cluster (Atlas) nutzen, URI per ENV setzen.
- **Sicherheit:** `.env` niemals committen, keine geheimen Keys im Frontend bundlen.

## Troubleshooting

- **Backend startet, aber Mongo‑Fehler (ECONNREFUSED 127.0.0.1:27017):**
  - MongoDB läuft nicht lokal oder Port anders belegt. Entweder Dienst starten oder `MONGODB_URI` auf Atlas anpassen.
- **PowerShell cURL‑Fehler bei `-H "Content-Type: application/json"`:**
  - In PowerShell `Invoke-RestMethod` nutzen:
    ```powershell
    $body = @{ location = "Berlin" } | ConvertTo-Json
    Invoke-RestMethod http://localhost:5000/widgets -Method Post -Headers @{ "Content-Type" = "application/json" } -Body $body
    ```
- **Klick auf Globus liefert nichts:**
  - Prüfen, ob das Overlay und der Globus im selben Container liegen (`globe.module.css`, Klassen `container`, `overlay`).
  - In der Browser‑Konsole sollte bei Klick ein Request auf `/geo/reverse?...` erscheinen.
- **Keine Suchvorschläge:**
  - Netzwerk‑Tab prüfen (`/geo/suggest?q=...`).
  - `APP_USER_AGENT` in `.env` korrekt gesetzt?
- **Doppelte Widgets:**
  - Frontend blockt Duplikate anhand des Labels. Optional im Backend einen Unique‑Index auf `location` setzen.
- **Polling zu häufig/zu selten:**
  - Intervall im `WeatherWidget.jsx` anpassen (20 s). TTL im Backend ggf. reduzieren/erhöhen.

## Lizenz

Dieses Projekt ist zu Lernzwecken gedacht. Falls eine Lizenz benötigt wird, kann z. B. die MIT‑Lizenz ergänzt werden.
