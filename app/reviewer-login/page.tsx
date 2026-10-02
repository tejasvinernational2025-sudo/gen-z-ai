"use client";

import { FormEvent, useEffect, useState } from "react";
import { getCurrentUser, signInWithPassword } from "@/lib/chat-history";

export default function ReviewerLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        if (user) window.location.replace("/");
      })
      .catch(() => {});
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setMessage("Email aur password dono required hain.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const user = await signInWithPassword(email.trim(), password);
      if (!user) throw new Error("Reviewer sign-in complete nahi hua.");
      window.location.replace("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reviewer sign-in nahi hua.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="reviewerLoginShell">
      <section className="reviewerLoginCard">
        <a href="/" className="reviewerBackLink">← Gen-z AI</a>

        <div className="reviewerLoginIntro">
          <span>REVIEWER ACCESS</span>
          <h1>Secure reviewer sign-in</h1>
          <p>This page is reserved for an authorized app/payment reviewer account.</p>
        </div>

        <form onSubmit={submit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              minLength={8}
              required
            />
          </label>

          <button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Continue"}
          </button>
        </form>

        {message && <div className="reviewerLoginMessage">{message}</div>}

        <small>
          Public student sign-in remains available on the main site through Google or a secure email link.
        </small>
      </section>
    </main>
  );
}
