"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  const [previouslyInstalled, setPreviouslyInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setInstalled(standalone);
    try {
      if (standalone) localStorage.setItem("genz-pwa-installed", "1");
      setPreviouslyInstalled(localStorage.getItem("genz-pwa-installed") === "1");
    } catch {}
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPreviouslyInstalled(true);
      try { localStorage.setItem("genz-pwa-installed", "1"); } catch {}
      setPromptEvent(null);
      setHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  return (
    <div style={{ padding: "12px 16px", margin: "12px 0", borderRadius: 14, background: "#eef2ff", color: "#1e1b4b" }}>
      <button type="button" onClick={async () => {
        if (previouslyInstalled) { setHelp((value) => !value); return; }
        if (!promptEvent) { setHelp((value) => !value); return; }
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") {
          setPromptEvent(null);
          setPreviouslyInstalled(true);
          try { localStorage.setItem("genz-pwa-installed", "1"); } catch {}
        }
      }} style={{ padding: "11px 17px", borderRadius: 10, border: 0, background: "#4f46e5", color: "white", fontWeight: 700, cursor: "pointer" }}>
        {previouslyInstalled ? "✓ Gen-Z AI installed? Open from Home Screen" : "📲 Install Gen-Z AI"}
      </button>
      {help && <p style={{ margin: "10px 0 0", fontSize: 13 }}>
        {previouslyInstalled ? "यदि Gen-Z AI पहले से फोन में है, तो Home Screen से वही ऐप खोलें। वेबसाइट से दूसरी कॉपी इंस्टॉल न करें। यदि ऐप हटा दी है, तो Chrome के ⋮ मेन्यू से Install app चुन सकते हैं।" : "Android Chrome: ऊपर दाईं ओर ⋮ मेन्यू खोलें और “Install app” या “Add to Home screen” चुनें। पहले से Gen-Z AI मौजूद हो तो दोबारा इंस्टॉल न करें।"}
      </p>}
    </div>
  );
}
