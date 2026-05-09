import { useEffect, useRef, useState } from "react";
import DVRPlayer from "./components/DVRPlayer";
import ClipList from "./components/ClipList";
import TelemetryPanel from "./components/TelemetryPanel";
import MapPanel from "./components/MapPanel";
import Timeline from "./components/Timeline";
import PlaybackControls from "./components/PlaybackControls";
import { useDVRStore } from "./store/dvrStore";
import "./App.css";

export default function App() {
  const { currentClip, sidebarTab, setSidebarTab } = useDVRStore();

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-dot" />
          <span className="logo-text">okDRIVER</span>
        </div>
        <div className="header-sep" />
        <span className="header-subtitle">DVR HISTORY PLAYBACK</span>
        <div className="header-right">
          <span className="rec-badge"><span className="rec-dot" />LIVE</span>
          <div className="header-sep" />
          <span className="header-stat">VEHICLE: <strong>MH-12-AB-3456</strong></span>
          <div className="header-sep" />
          <span className="header-stat">DATE: <strong>09 MAY 2026</strong></span>
        </div>
      </header>

      <main className="app-main">
        <section className="video-section">
          <DVRPlayer />
          <Timeline />
          <PlaybackControls />
        </section>

        <aside className="sidebar">
          <div className="sidebar-tabs">
            {["CLIPS", "TELEMETRY", "MAP"].map((t) => (
              <button
                key={t}
                className={`stab ${sidebarTab === t ? "active" : ""}`}
                onClick={() => setSidebarTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="sidebar-body">
            {sidebarTab === "CLIPS" && <ClipList />}
            {sidebarTab === "TELEMETRY" && <TelemetryPanel />}
            {sidebarTab === "MAP" && <MapPanel />}
          </div>
        </aside>
      </main>
    </div>
  );
}
