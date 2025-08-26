import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (stored) setTheme(stored);
    else if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: light)").matches
    ) {
      setTheme("light");
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  return (
    <button
      className="btn"
      title="Theme umschalten"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      style={{ padding: "8px 12px" }}
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
