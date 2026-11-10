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

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setInstalled(standalone);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
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
        if (!promptEvent) { setHelp((value) => !value); return; }
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") setPromptEvent(null);
      }} style={{ padding: "11px 17px", borderRadius: 10, border: 0, background: "#4f46e5", color: "white", fontWeight: 700, cursor: "pointer" }}>
        📲 Install Gen-Z AI
      </button>
      {help && <p style={{ margin: "10px 0 0", fontSize: 13 }}>
        Android Chrome: ऊपर दाईं ओर ⋮ मेन्यू खोलें और “Install app” या “Add to Home screen” चुनें। यदि विकल्प नहीं है, Chrome अपडेट करके साइट फिर खोलें।
      </p>}
    </div>
  );
}
