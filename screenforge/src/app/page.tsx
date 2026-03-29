import Link from "next/link";
import { Video, Brain, Share2, Monitor } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900">
            ScreenForge
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Bot-free screen recorder with AI transcription, summaries, and SOP generation
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="rounded-lg bg-red-600 px-8 py-3 text-lg font-medium text-white hover:bg-red-700"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-gray-300 px-8 py-3 text-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              icon={<Monitor className="h-8 w-8" />}
              title="Bot-Free"
              description="Record your screen without bots joining calls. Only you see the permission prompt."
            />
            <Feature
              icon={<Video className="h-8 w-8" />}
              title="Full Control"
              description="Start, pause, resume, stop. Keyboard shortcuts. PiP mode with webcam overlay."
            />
            <Feature
              icon={<Brain className="h-8 w-8" />}
              title="AI Powered"
              description="Auto-transcription, smart summaries, action items, and SOP guides."
            />
            <Feature
              icon={<Share2 className="h-8 w-8" />}
              title="Easy Sharing"
              description="One-click public links. Anyone can view without signing in."
            />
          </div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-gray-500">
        ScreenForge — Built with Next.js, OpenAI, and Google Drive
      </footer>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-lg border p-6 text-left">
      <div className="mb-3 text-red-600">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}
