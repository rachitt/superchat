"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { useSocket } from "@/hooks/use-socket";
import { Loader2 } from "lucide-react";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      connectSocket(session.session?.token);
      return () => disconnectSocket();
    }
  }, [session]);

  useSocket();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return null;

  return <div className="flex h-screen">{children}</div>;
}
