"use client";

import { useState } from "react";
import { useTRPC } from "@/lib/trpc";
import { useMutation } from "@tanstack/react-query";
import { AI_BOT_NAME } from "@superchat/shared";

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">Bot Settings</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            &times;
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Bot Name
            </label>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder={AI_BOT_NAME}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Personality
            </label>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="friendly and concise, formal, witty..."
              rows={2}
              className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-300"
            >
              <span className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}>
                &#9654;
              </span>
              Advanced: Custom System Prompt
            </button>
            {showAdvanced && (
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Override the default system prompt entirely..."
                rows={5}
                className="mt-2 w-full resize-none rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500"
              />
            )}
          </div>

          {/* Preview */}
          <div className="rounded-md border border-zinc-700 bg-zinc-800/50 p-3">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Preview
            </p>
            <div className="flex gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                AI
              </div>
              <p className="text-sm text-zinc-300">{previewIntro}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            {saved && (
              <span className="text-xs text-green-400">Saved!</span>
            )}
            <button
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
