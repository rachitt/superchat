"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { useSocket } from "@/hooks/use-socket";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.session?.token) {
      connectSocket(session.session.token);
      return () => disconnectSocket();
    }
  }, [session]);

  useSocket();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return <div className="flex h-screen">{children}</div>;
}
