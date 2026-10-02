"use client";

import { FormEvent, useEffect, useState } from "react";
import { getAccessToken, getCurrentUser } from "@/lib/chat-history";

const CATEGORIES = [
  ["account", "Account / login"],
  ["payment", "Payment / activation"],
  ["refund", "Refund request"],
  ["technical", "Technical issue"],
  ["feedback", "Feedback"],
  ["other", "Other"],
] as const;

export default function SupportForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("technical");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        if (user?.email) setEmail(user.email);
      })
      .catch(() => {});
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setResult("");

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, email, category, message }),
      });

      const raw = await response.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error("Support response read nahi hua.");
      }

      if (!response.ok) throw new Error(data?.error || "Support request submit nahi hui.");

      const ref = data?.requestId ? String(data.requestId).slice(0, 8).toUpperCase() : "";
      setResult(ref ? `Request submit ho gayi ✅ Reference: ${ref}` : "Request submit ho gayi ✅");
      setMessage("");
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Support request submit nahi hui.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="supportForm" onSubmit={submit}>
      <div className="supportTwoCol">
        <label>
          <span>Name (optional)</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            autoComplete="name"
            placeholder="Your name"
          />
        </label>

        <label>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={180}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </label>
      </div>

      <label>
        <span>Issue type</span>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Tell us what happened</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={6}
          minLength={15}
          maxLength={3000}
          placeholder="Feature, error, payment/order reference, what you expected, aur kya hua — jitni useful detail ho likho."
          required
        />
      </label>

      <button type="submit" disabled={busy}>
        {busy ? "Submitting…" : "Submit support request"}
      </button>

      {result && <div className="supportResult">{result}</div>}
      <small>
        Support form me passwords, OTP, card PIN, CVV ya unnecessary personal documents mat bhejo.
      </small>
    </form>
  );
}
