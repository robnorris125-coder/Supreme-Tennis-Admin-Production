"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

export default function LoginPage() {
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);
const [message, setMessage] = useState("");
const [busy, setBusy] = useState(false);

async function signIn(event: FormEvent) {
event.preventDefault();
setBusy(true);
setMessage("");

const { error } =
await createSupabaseBrowserClient().auth.signInWithPassword({
email,
password,
});

if (error) {
setMessage(error.message);
setBusy(false);
return;
}

window.location.assign("/");
}

async function sendMagicLink() {
if (!email) {
setMessage("Enter your email address first.");
return;
}

setBusy(true);
setMessage("");

const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
email,
options: {
emailRedirectTo: `${window.location.origin}/auth/confirm`,
},
});

setMessage(
error ? error.message : "Check your email for your secure sign-in link."
);
setBusy(false);
}

return (
<main className="login-page">
<section className="login-layout">
<div className="login-card">
<div className="brand">
<div className="logo">ST</div>
<div>
<div className="brand-name">
TENNIS <span>SUPREME</span>
</div>
<div className="brand-admin">ADMIN</div>
</div>
</div>

<h1>Welcome back</h1>

<p className="intro">
Sign in to access your tennis business dashboard and management
tools.
</p>

<form onSubmit={signIn}>
<label htmlFor="email">Email address</label>

<input
id="email"
type="email"
required
value={email}
onChange={(event) => setEmail(event.target.value)}
autoComplete="email"
placeholder="you@example.com"
/>

<label htmlFor="password" className="password-label">
Password
</label>

<div className="password-box">
<input
id="password"
type={showPassword ? "text" : "password"}
required
value={password}
onChange={(event) => setPassword(event.target.value)}
autoComplete="current-password"
placeholder="Enter your password"
/>

<button
type="button"
className="eye-button"
onClick={() => setShowPassword((value) => !value)}
aria-label={showPassword ? "Hide password" : "Show password"}
>
{showPassword ? "◉" : "◎"}
</button>
</div>

<button className="primary-button" disabled={busy}>
{busy ? "Signing in..." : "Sign in"}
</button>
</form>

<div className="divider">
<span />
<small>OR</small>
<span />
</div>

<button
type="button"
className="secondary-button"
onClick={sendMagicLink}
disabled={busy}
>
✉ Email me a secure sign-in link
</button>

{message && (
<div
className={
message.startsWith("Check")
? "message success"
: "message error"
}
role="status"
>
{message}
</div>
)}

<p className="security-note">
◇ We take your privacy and data security seriously.
</p>
</div>

<aside className="benefits">
<div className="benefit">
<div className="benefit-icon">↗</div>
<div>
<h3>Grow your business</h3>
<p>
Track performance, manage customers and grow your tennis
business.
</p>
</div>
</div>

<div className="benefit">
<div className="benefit-icon">✓</div>
<div>
<h3>Manage with ease</h3>
<p>
Everything you need to run your tennis business in one place.
</p>
</div>
</div>

<div className="benefit">
<div className="benefit-icon">◇</div>
<div>
<h3>Secure &amp; reliable</h3>
<p>Your business data is protected with secure authentication.</p>
</div>
</div>
</aside>
</section>

<style jsx>{`
.login-page {
min-height: 100vh;
box-sizing: border-box;
display: flex;
align-items: center;
justify-content: center;
padding: 48px 28px;
font-family: Arial, Helvetica, sans-serif;
position: relative;
overflow: hidden;
background:
linear-gradient(
90deg,
rgba(255, 255, 255, 0.96) 0%,
rgba(255, 255, 255, 0.88) 45%,
rgba(255, 255, 255, 0.95) 100%
),
linear-gradient(135deg, #dbe6e1 0%, #f5f7f5 100%);
}

.login-page::before {
content: "";
position: absolute;
left: -80px;
bottom: -120px;
width: 520px;
height: 520px;
border-radius: 50%;
background:
radial-gradient(
circle at 40% 40%,
#d7ef36 0%,
#b8d52a 30%,
#7fa329 54%,
transparent 55%
);
opacity: 0.9;
filter: blur(1px);
}

.login-page::after {
content: "";
position: absolute;
inset: 0;
pointer-events: none;
background:
linear-gradient(
90deg,
transparent 0 18%,
rgba(53, 85, 73, 0.08) 18% 19%,
transparent 19% 100%
),
linear-gradient(
0deg,
transparent 0 68%,
rgba(53, 85, 73, 0.08) 68% 69%,
transparent 69% 100%
);
}

.login-layout {
width: min(100%, 1100px);
display: grid;
grid-template-columns: 590px 1fr;
gap: 70px;
align-items: center;
position: relative;
z-index: 1;
}

.login-card {
background: rgba(255, 255, 255, 0.97);
border: 1px solid #e2e6e8;
border-radius: 22px;
padding: 46px 50px;
box-shadow: 0 24px 70px rgba(27, 45, 55, 0.16);
}

.brand {
display: flex;
gap: 16px;
align-items: center;
margin-bottom: 42px;
}

.logo {
width: 58px;
height: 58px;
border-radius: 15px;
background: #171d22;
display: flex;
align-items: center;
justify-content: center;
color: #c8e322;
font-size: 25px;
font-weight: 900;
}

.brand-name {
color: #151c24;
font-size: 21px;
font-weight: 900;
letter-spacing: 0.08em;
}

.brand-name span {
color: #9dbb00;
}

.brand-admin {
color: #4f5b68;
font-size: 16px;
font-weight: 700;
letter-spacing: 0.24em;
margin-top: 3px;
}

h1 {
color: #17202b;
margin: 0 0 8px;
font-size: 34px;
line-height: 1.15;
letter-spacing: -0.03em;
}

.intro {
margin: 0 0 32px;
color: #5f6b7b;
line-height: 1.5;
font-size: 16px;
max-width: 440px;
}

label {
display: block;
margin: 0 0 8px;
color: #18212b;
font-weight: 700;
font-size: 14px;
}

.password-label {
margin-top: 22px;
}

input {
width: 100%;
box-sizing: border-box;
height: 56px;
border: 1px solid #cbd3da;
border-radius: 10px;
padding: 0 16px;
font-size: 16px;
color: #18212b;
background: #fff;
outline: none;
}

input:focus {
border-color: #3479df;
box-shadow: 0 0 0 4px rgba(52, 121, 223, 0.12);
}

.password-box {
position: relative;
}

.password-box input {
padding-right: 58px;
}

.eye-button {
position: absolute;
right: 9px;
top: 50%;
transform: translateY(-50%);
width: 40px;
height: 40px;
border: 0;
background: transparent;
border-radius: 8px;
color: #657383;
font-size: 22px;
cursor: pointer;
}

.eye-button:hover {
background: #f0f3f5;
}

.primary-button,
.secondary-button {
width: 100%;
height: 56px;
border-radius: 10px;
font-size: 16px;
font-weight: 800;
cursor: pointer;
}

.primary-button {
margin-top: 28px;
border: 0;
background: linear-gradient(90deg, #2861d9, #347aeb);
color: white;
box-shadow: 0 8px 22px rgba(40, 97, 217, 0.2);
}

.secondary-button {
border: 1px solid #2f71da;
background: white;
color: #235ec7;
}

button:disabled {
opacity: 0.6;
cursor: wait;
}

.divider {
display: flex;
align-items: center;
gap: 16px;
margin: 26px 0;
}

.divider span {
height: 1px;
background: #dfe4e8;
flex: 1;
}

.divider small {
color: #687686;
font-size: 12px;
}

.message {
margin-top: 18px;
padding: 12px 14px;
border-radius: 8px;
font-size: 14px;
}

.error {
background: #fff1f0;
border: 1px solid #efc5c2;
color: #a82e28;
}

.success {
background: #f1f8e9;
border: 1px solid #cce0b1;
color: #466a22;
}

.security-note {
margin: 28px 0 0;
color: #657383;
font-size: 12px;
}

.benefits {
display: flex;
flex-direction: column;
gap: 38px;
color: #17202b;
}

.benefit {
display: flex;
gap: 20px;
align-items: flex-start;
}

.benefit-icon {
width: 58px;
height: 58px;
flex: 0 0 58px;
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
background: #f2f6dd;
color: #7da000;
font-size: 26px;
font-weight: 900;
}

.benefit h3 {
margin: 4px 0 8px;
font-size: 18px;
color: #18212b;
}

.benefit p {
margin: 0;
max-width: 300px;
color: #59687a;
font-size: 15px;
line-height: 1.55;
}

@media (max-width: 900px) {
.login-layout {
grid-template-columns: 1fr;
max-width: 560px;
}

.benefits {
display: none;
}

.login-page::before {
opacity: 0.35;
}
}

@media (max-width: 560px) {
.login-page {
padding: 20px 14px;
}

.login-card {
padding: 30px 22px;
border-radius: 18px;
}

.brand {
margin-bottom: 30px;
}

h1 {
font-size: 29px;
}
}
`}</style>
</main>
);
}
