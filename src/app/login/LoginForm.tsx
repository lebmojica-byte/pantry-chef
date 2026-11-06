"use client";

import { Eye, EyeSlash, SpinnerGap } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const MODES = [
  { id: "in", label: "Sign in", title: "Welcome back", button: "Sign in" },
  { id: "up", label: "Create account", title: "Set up your kitchen", button: "Create account" },
] as const;

export default function LoginForm({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const widgetBox = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const current = MODES.find((m) => m.id === mode)!;
  const router = useRouter();

  useEffect(() => {
    // Already signed in: straight to the kitchen. Failed confirmation links land here with ?error_description=.
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) return router.replace("/");
        const linkError = new URLSearchParams(location.search).get("error_description");
        if (linkError) setMessage({ ok: false, text: `${linkError}. If you confirmed before, just sign in.` });
      });
  }, [router]);

  function renderTurnstile() {
    if (!turnstileSiteKey || !widgetBox.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(widgetBox.current, {
      sitekey: turnstileSiteKey,
      callback: (t: string) => setCaptchaToken(t),
      "expired-callback": () => setCaptchaToken(undefined),
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error, data } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
        : await supabase.auth.signUp({
            email,
            password,
            // ".." from /login/ is the app root, basePath included.
            options: { captchaToken, emailRedirectTo: new URL("..", location.href).href },
          });
    setBusy(false);
    // Tokens are single-use: always get a fresh one for the next attempt.
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      setCaptchaToken(undefined);
    }
    if (error) return setMessage({ ok: false, text: error.message });
    if (mode === "up" && !data.session) {
      return setMessage({ ok: true, text: "Check your email and click the link to confirm your account." });
    }
    router.replace("/");
  }

  const needsCaptcha = Boolean(turnstileSiteKey) && !captchaToken;

  return (
    <form onSubmit={submit} noValidate={false}>
      <h2 className="text-3xl font-bold tracking-[-0.02em]">{current.title}</h2>

      <div role="tablist" aria-label="Sign in or create account" className="mt-6 grid grid-cols-2 rounded-full bg-surface-2 p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => {
              setMode(m.id);
              setMessage(null);
            }}
            className="press relative min-h-11 rounded-full px-3 text-sm font-semibold"
          >
            {mode === m.id && (
              <motion.span
                layoutId="auth-tab"
                className="absolute inset-0 rounded-full bg-bg shadow-[0_2px_0_var(--line)]"
                transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className={`relative ${mode === m.id ? "text-ink" : "text-muted"}`}>{m.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold" htmlFor="password">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={mode === "up" ? 8 : undefined}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field pr-12"
              aria-describedby={mode === "up" ? "pw-help" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="press absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-ink"
            >
              {showPassword ? <EyeSlash size={22} aria-hidden /> : <Eye size={22} aria-hidden />}
            </button>
          </div>
          {mode === "up" && <p id="pw-help" className="text-sm text-muted">At least 8 characters.</p>}
        </div>
      </div>

      {turnstileSiteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={renderTurnstile} />
          <div ref={widgetBox} className="mt-5" />
        </>
      )}

      <AnimatePresence initial={false}>
        {message && (
          <motion.p
            key={message.text}
            role={message.ok ? "status" : "alert"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className={`mt-5 rounded-xl px-4 py-3 text-sm font-medium ${
              message.ok ? "bg-herb-soft text-herb-ink" : "bg-tomato-soft text-tomato-ink"
            }`}
          >
            {message.text}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        disabled={busy || needsCaptcha}
        className="key mt-6 flex min-h-13 w-full items-center justify-center gap-2 text-lg font-bold"
      >
        {busy && <SpinnerGap size={22} className="animate-spin" aria-hidden />}
        {busy ? "One moment" : current.button}
      </button>
    </form>
  );
}
