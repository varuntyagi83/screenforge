import Link from "next/link";
import { Video, Brain, Share2, Monitor, Zap, Shield, Clock, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Nav */}
      <nav className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-red-600">Screen</span>Forge
          </span>
          <Link
            href="/login"
            className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-orange-50" />
        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center lg:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-sm font-medium text-red-700">
            <Zap className="h-3.5 w-3.5" />
            No bots. No installs. Just record.
          </div>

          <h1 className="mt-8 text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            Screen recording
            <br />
            <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
              that thinks for you
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
            Record your screen, get instant AI transcription, smart summaries,
            action items, and step-by-step SOP guides. All without a single bot
            joining your call.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-red-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700 hover:shadow-red-600/30"
            >
              Start Recording Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#features"
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
            >
              See How It Works
            </Link>
          </div>

          {/* Preview mockup */}
          <div className="mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="h-3 w-3 rounded-full bg-green-500" />
              <span className="ml-4 text-xs text-gray-500">ScreenForge — Recording in progress</span>
            </div>
            <div className="flex items-center justify-center px-8 py-16">
              <div className="flex items-center gap-4 rounded-full bg-gray-800/80 px-6 py-3 backdrop-blur">
                <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                <span className="font-mono text-lg text-white">00:04:32</span>
                <span className="text-gray-400">|</span>
                <span className="text-sm text-gray-300">⏸ Pause</span>
                <span className="text-sm text-gray-300">⏹ Stop</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-gray-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
              From one-click recording to AI-generated documentation — all in one tool.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Monitor className="h-6 w-6" />}
              title="Bot-Free Recording"
              description="Pure browser-based capture. No one on your call sees a bot join. Only you see the permission prompt — everyone else is unaware."
            />
            <FeatureCard
              icon={<Video className="h-6 w-6" />}
              title="Screen + Camera PiP"
              description="Record your screen with a circular webcam overlay. Perfect for tutorials, walkthroughs, and presentations."
            />
            <FeatureCard
              icon={<Brain className="h-6 w-6" />}
              title="AI Transcription & Summary"
              description="Whisper transcribes every word. GPT-4o generates concise summaries, extracts action items, and builds SOP guides."
            />
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="Instant Local-First"
              description="Recordings save to your browser instantly. Upload to Google Drive happens in the background. Works offline."
            />
            <FeatureCard
              icon={<Share2 className="h-6 w-6" />}
              title="One-Click Sharing"
              description="Toggle a link and share with anyone. Viewers see the video, transcript, summary, and SOP — no login required."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Your Data, Your Drive"
              description="Videos are stored in your own Google Drive. We never host your recordings. Delete anytime — it's your storage."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t py-24">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">
            Three steps. That&apos;s it.
          </h2>

          <div className="mt-16 grid gap-12 sm:grid-cols-3">
            <Step number="1" title="Record" description="Pick screen, camera, or PiP mode. Hit record. Use keyboard shortcuts or the floating control bar." />
            <Step number="2" title="AI Processes" description="Whisper transcribes the audio. GPT-4o generates a summary, action items, and a step-by-step SOP guide." />
            <Step number="3" title="Share" description="Toggle sharing on, copy the link. Anyone can view the recording with full transcript and AI summary." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-gray-900 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to record smarter?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-gray-400">
            Sign in with Google and make your first recording in under 30 seconds.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-red-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-red-700"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-gray-500">
        ScreenForge — Built with Next.js, OpenAI, and Google Drive
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-lg font-bold text-white">
        {number}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
    </div>
  );
}
