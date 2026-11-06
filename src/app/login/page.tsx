import Hero from "./Hero";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  // Turnstile is "configured or off": no site key at build time = no widget.
  return (
    <main className="grid min-h-[100dvh] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Hero />
      <section className="flex items-start justify-center px-5 pb-12 pt-8 sm:px-8 lg:items-center lg:py-12">
        <div className="w-full max-w-sm">
          <LoginForm turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null} />
        </div>
      </section>
    </main>
  );
}
