"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/common/AppNav";

type Theme = "light" | "dark" | "system";

export function SettingsClient() {
  const [theme, setTheme] = useState<Theme>("light");
  const [markForReview, setMarkForReview] = useState(true);
  const [sound, setSound] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cbt-forge-settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      setTheme(parsed.theme ?? "light");
      setMarkForReview(parsed.markForReview ?? true);
      setSound(parsed.sound ?? false);
      setFullscreen(parsed.fullscreen ?? false);
      applyTheme(parsed.theme ?? "light");
    }
  }, []);

  function applyTheme(next: Theme) {
    const effective = next === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : next;
    document.documentElement.dataset.theme = effective;
  }

  function save(nextTheme = theme, nextMark = markForReview, nextSound = sound, nextFullscreen = fullscreen) {
    localStorage.setItem("cbt-forge-settings", JSON.stringify({ theme: nextTheme, markForReview: nextMark, sound: nextSound, fullscreen: nextFullscreen }));
    applyTheme(nextTheme);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-5">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="text-sm font-semibold uppercase text-accent">CBT Forge</div><h1 className="mt-1 text-2xl font-semibold text-ink">Settings</h1></div>
            <AppNav />
          </div>
        </header>
        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Theme</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {(["light", "dark", "system"] as Theme[]).map((item) => (
              <button key={item} className={`rounded-md border px-4 py-2 text-sm font-semibold ${theme === item ? "border-forge bg-[#eef7f8] text-forge" : "border-line text-ink"}`} onClick={() => { setTheme(item); save(item); }}>
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Default Test Behavior</h2>
          <div className="mt-3 grid gap-3 text-sm text-ink">
            <label className="flex items-center gap-2"><input type="checkbox" checked={markForReview} onChange={(event) => { setMarkForReview(event.target.checked); save(theme, event.target.checked); }} /> Mark for Review</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={sound} onChange={(event) => { setSound(event.target.checked); save(theme, markForReview, event.target.checked); }} /> Sound</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={fullscreen} onChange={(event) => { setFullscreen(event.target.checked); save(theme, markForReview, sound, event.target.checked); }} /> Fullscreen</label>
          </div>
          <p className="mt-4 text-sm text-steel">These settings do not affect scoring.</p>
        </section>
      </div>
    </main>
  );
}
