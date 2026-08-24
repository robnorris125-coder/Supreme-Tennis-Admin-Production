"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    if (error) { setMessage(error.message); setBusy(false); return; }
    window.location.assign("/");
  }

  async function sendMagicLink() {
    if (!email) { setMessage("Enter your email address first."); return; }
    setBusy(true); setMessage("");
    const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setMessage(error ? error.message : "Check your email for your secure sign-in link.");
    setBusy(false);
  }

  return <main className="access-page"><section className="access-card">
    <span className="access-logo">TG</span><p className="section-kicker">Tennis Growth Admin</p>
    <h1>Sign in to your business</h1><p>Use the email address authorised for your tennis business.</p>
    <form onSubmit={signIn} className="login-form">
      <label>Email address<input type="email" required value={email} onChange={event=>setEmail(event.target.value)} autoComplete="email" /></label>
      <label>Password<input type="password" required value={password} onChange={event=>setPassword(event.target.value)} autoComplete="current-password" /></label>
      <button className="primary" disabled={busy}>{busy?"Signing in…":"Sign in"}</button>
    </form>
    <button className="secondary magic-link" disabled={busy} onClick={sendMagicLink}>Email me a secure sign-in link</button>
    {message&&<p role="status" className="login-message">{message}</p>}
  </section></main>;
}
