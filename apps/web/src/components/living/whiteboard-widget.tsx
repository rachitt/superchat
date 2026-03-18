"use client";

import { useState } from "react";
import { Pencil, Users } from "lucide-react";
import { WhiteboardModal } from "./whiteboard-modal";
import { cn } from "@/lib/utils";

interface WhiteboardWidgetProps {
  messageId: string;
  payload: {
    title?: string;
    shapes?: Record<string, unknown>;
  };
}

export function WhiteboardWidget({ messageId, payload }: WhiteboardWidgetProps) {
  const [showModal, setShowModal] = useState(false);

  const title = payload.title || "Whiteboard";
  const shapeCount = payload.shapes ? Object.keys(payload.shapes).length : 0;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={cn(
          "mt-2 flex w-full max-w-sm items-center gap-3 rounded-xl border border-border/70 bg-gradient-to-br from-teal-500/5 to-emerald-500/5 p-4 text-left transition-all",
          "hover:border-teal-500/40 hover:shadow-md hover:shadow-teal-500/5"
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-500/15">
          <Pencil className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {shapeCount > 0 ? `${shapeCount} shapes` : "Empty canvas"}
            </span>
            <span className="flex items-center gap-0.5 text-[11px] text-teal-600 dark:text-teal-400">
              <Users className="h-2.5 w-2.5" />
              Collaborative
            </span>
          </div>
        </div>
        <span className="rounded-md bg-teal-500/15 px-2.5 py-1 text-[11px] font-medium text-teal-600 dark:text-teal-400">
          Open
        </span>
      </button>

      {showModal && (
        <WhiteboardModal
          messageId={messageId}
          title={title}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
