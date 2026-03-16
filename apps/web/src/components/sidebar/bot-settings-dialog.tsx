"use client";

import { useState } from "react";
import { useTRPC } from "@/lib/trpc";
import { useMutation } from "@tanstack/react-query";
import { AI_BOT_NAME } from "@superchat/shared";
import { Bot, X, ChevronRight, Check, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface BotSettingsDialogProps {
  workspaceId: string;
  onClose: () => void;
}

export function BotSettingsDialog({ workspaceId, onClose }: BotSettingsDialogProps) {
  const [botName, setBotName] = useState(AI_BOT_NAME);
  const [personality, setPersonality] = useState("friendly and concise");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saved, setSaved] = useState(false);

  const trpc = useTRPC();
  const mutation = useMutation(
    trpc.workspace.updateBotSettings.mutationOptions({
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      },
    })
  );

  const handleSave = () => {
    const prompt =
      systemPrompt.trim() ||
      `You are ${botName}, a helpful AI assistant. Your personality is: ${personality}. Be concise and helpful in a team chat setting.`;
    mutation.mutate({
      workspaceId,
      systemPrompt: prompt,
      botName: botName || undefined,
      personality: personality || undefined,
    });
  };

  const previewIntro = `Hi! I'm ${botName || AI_BOT_NAME}. ${
    personality ? `I'm ${personality}.` : ""
  } How can I help you today?`;

  const inputClass = "w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-xl border border-border bg-popover shadow-2xl animate-float-up">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-foreground">Bot Settings</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Bot Name</label>
            <input type="text" value={botName} onChange={(e) => setBotName(e.target.value)} placeholder={AI_BOT_NAME} className={inputClass} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Personality</label>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="friendly and concise, formal, witty..."
              rows={2}
              className={cn(inputClass, "resize-none")}
            />
          </div>

          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className={cn("h-3 w-3 transition-transform", showAdvanced && "rotate-90")} />
              Advanced: Custom System Prompt
            </button>
            {showAdvanced && (
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Override the default system prompt entirely..."
                rows={5}
                className={cn(inputClass, "mt-2 resize-none")}
              />
            )}
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-border bg-background/50 p-3.5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Preview</p>
            <div className="flex gap-2.5">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-[9px] font-bold text-white">
                  <Bot className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-secondary-foreground leading-relaxed">{previewIntro}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <Check className="h-3 w-3" /> Saved!
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
