import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import styles from "../styles/globe.module.css";

const ReactGlobe = dynamic(() => import("react-globe.gl"), { ssr: false });

export default function Globe({ onPick }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 600, h: 360 });

  useEffect(() => {
    if (!ref.current) return;

    const obs = new ResizeObserver(([entry]) => {
      const { width } = entry.contentRect;
      // quadratisch: Höhe = Breite
      // Hinweis: contentRect ist i. d. R. bereits der "Content"-Bereich ohne Padding.
      const side = Math.max(320, Math.floor(width)); // ggf. min 320 beibehalten
      setSize({ w: side, h: side });
    });

    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <ReactGlobe
        width={size.w}
        height={size.h}
        onGlobeClick={(pt) => onPick?.({ lat: pt.lat, lng: pt.lng })}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        showAtmosphere
        atmosphereAltitude={0.15}
      />
    </div>
  );
}
