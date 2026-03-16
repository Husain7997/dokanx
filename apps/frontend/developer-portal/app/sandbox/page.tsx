"use client";

import { useState } from "react";
import { useAuth } from "@dokanx/auth";
import { getApiBaseUrl } from "@dokanx/utils";

export default function SandboxPage() {
  const { login, logout, status } = useAuth();
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function handleRegister() {
    setMessage(null);
    const response = await fetch(`${getApiBaseUrl()}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
        role: "DEVELOPER",
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.message || "Registration failed");
      return;
    }
    setMessage("Developer account created. You can sign in now.");
  }

  async function handleLogin() {
    setMessage(null);
    try {
      await login({ email: loginEmail, password: loginPassword });
      setMessage("Logged in successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    }
  }

  return (
    <section className="grid gap-6 rounded-3xl border border-white/40 bg-white/70 p-8">
      <div>
        <h2 className="dx-display text-2xl">Sandbox</h2>
        <p className="text-sm text-muted-foreground">
          Developer registration, login, and local testing workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-3 rounded-3xl border border-white/60 bg-white/80 p-5">
          <p className="text-sm font-semibold text-foreground">Register developer</p>
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="Name"
            value={registerName}
            onChange={(event) => setRegisterName(event.target.value)}
          />
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="Email"
            value={registerEmail}
            onChange={(event) => setRegisterEmail(event.target.value)}
          />
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="Password"
            type="password"
            value={registerPassword}
            onChange={(event) => setRegisterPassword(event.target.value)}
          />
          <button
            className="w-fit rounded-full border border-white/60 bg-black px-4 py-2 text-xs font-semibold text-white"
            onClick={handleRegister}
          >
            Create account
          </button>
        </div>

        <div className="grid gap-3 rounded-3xl border border-white/60 bg-white/80 p-5">
          <p className="text-sm font-semibold text-foreground">Login</p>
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="Email"
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
          />
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="Password"
            type="password"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
          />
          <button
            className="w-fit rounded-full border border-white/60 bg-black px-4 py-2 text-xs font-semibold text-white"
            onClick={handleLogin}
          >
            Sign in
          </button>
          {status === "authenticated" ? (
            <button
              className="w-fit rounded-full border border-white/60 bg-white px-4 py-2 text-xs font-semibold text-foreground"
              onClick={logout}
            >
              Sign out
            </button>
          ) : null}
        </div>
      </div>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
    </section>
  );
}
