"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import "tldraw/tldraw.css";
import { X } from "lucide-react";
import { getSocket } from "@/lib/socket";

const Tldraw = dynamic(
  () => import("tldraw").then((mod) => mod.Tldraw),
  { ssr: false, loading: () => (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )}
);

interface WhiteboardModalProps {
  messageId: string;
  title: string;
  onClose: () => void;
}

export function WhiteboardModal({ messageId, title, onClose }: WhiteboardModalProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const editorRef = useRef<any>(null);

  // Listen for remote updates
  useEffect(() => {
    const socket = getSocket();

    const handleUpdate = (data: { messageId: string; payload: Record<string, unknown> }) => {
      if (data.messageId !== messageId) return;
      // Remote shapes arrived — could merge here if needed
    };

    socket.on("living:update", handleUpdate);
    return () => {
      socket.off("living:update", handleUpdate);
    };
  }, [messageId]);

  const handleChange = useCallback(
    (editor: any) => {
      editorRef.current = editor;

      // Debounce persistence
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const snapshot = editor.store.getSnapshot("document");
        const socket = getSocket();
        socket.emit("living:interact", {
          messageId,
          action: "draw",
          data: {
            shapes: snapshot,
            persist: true,
          },
        });
      }, 1000);

      // Broadcast immediately (no persist flag)
      const snapshot = editor.store.getSnapshot("document");
      const socket = getSocket();
      socket.emit("living:interact", {
        messageId,
        action: "draw",
        data: { shapes: snapshot },
      });
    },
    [messageId]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex h-[90vh] w-[90vw] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tldraw canvas */}
        <div className="flex-1">
          <Tldraw
            onMount={(editor: any) => {
              editorRef.current = editor;
              editor.store.listen(() => handleChange(editor), {
                source: "user",
                scope: "document",
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
