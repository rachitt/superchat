export default function Home() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">SuperChat</h1>
        <p className="mt-2 text-zinc-400">
          Real-time chat with AI, games, and living messages
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/login"
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}
