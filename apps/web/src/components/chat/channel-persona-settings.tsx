"use client";

import { useState, useEffect } from "react";
import { useTRPC } from "@/lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AI_PERSONAS } from "@superchat/shared";
import { cn } from "@/lib/utils";
import {
  Bot,
  Briefcase,
  Coffee,
  SmilePlus,
  GraduationCap,
  Palette,
  X,
  Check,
  Loader2,
} from "lucide-react";

interface ChannelPersonaSettingsProps {
  channelId: string;
  open: boolean;
  onClose: () => void;
}

const PERSONA_ICONS: Record<string, React.ReactNode> = {
  professional: <Briefcase className="h-4 w-4" />,
  casual: <Coffee className="h-4 w-4" />,
  sarcastic: <SmilePlus className="h-4 w-4" />,
  mentor: <GraduationCap className="h-4 w-4" />,
  creative: <Palette className="h-4 w-4" />,
};

export function ChannelPersonaSettings({ channelId, open, onClose }: ChannelPersonaSettingsProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: current, isLoading } = useQuery({
    ...trpc.channel.getPersona.queryOptions({ channelId }),
    enabled: open,
  });

  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (current) {
      setSelectedPersona(current.persona ?? null);
      setCustomPrompt(current.customPrompt ?? "");
      setShowCustom(!!current.customPrompt);
    }
  }, [current]);

  const mutation = useMutation({
    ...trpc.channel.setPersona.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.channel.getPersona.queryKey({ channelId }) });
      onClose();
    },
  });

  const handleSave = () => {
    mutation.mutate({
      channelId,
      persona: showCustom ? null : selectedPersona,
      customPrompt: showCustom ? customPrompt || null : null,
    });
  };

  const handleClear = () => {
    mutation.mutate({
      channelId,
      persona: null,
      customPrompt: null,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/15 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-xl border border-border bg-popover shadow-2xl animate-float-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Bot className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-semibold text-foreground">AI Persona</h3>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Persona presets */}
              <p className="mb-3 text-xs text-muted-foreground">Choose a personality for SuperBot in this channel</p>
              <div className="grid grid-cols-1 gap-2">
                {AI_PERSONAS.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => {
                      setSelectedPersona(persona.id);
                      setShowCustom(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
                      selectedPersona === persona.id && !showCustom
                        ? "border-teal-500/50 bg-teal-500/5 ring-1 ring-teal-500/20"
                        : "border-border/60 hover:border-border hover:bg-accent/50"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                      selectedPersona === persona.id && !showCustom
                        ? "bg-teal-500/10 text-teal-700 dark:text-teal-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {PERSONA_ICONS[persona.id]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-foreground">{persona.label}</div>
                      <div className="text-[11px] text-muted-foreground">{persona.description}</div>
                    </div>
                    {selectedPersona === persona.id && !showCustom && (
                      <Check className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                    )}
                  </button>
                ))}
              </div>

              {/* Custom prompt toggle */}
              <button
                onClick={() => {
                  setShowCustom(!showCustom);
                  if (!showCustom) setSelectedPersona(null);
                }}
                className={cn(
                  "mt-3 w-full rounded-lg border px-3 py-2.5 text-left text-[13px] transition-all",
                  showCustom
                    ? "border-teal-500/50 bg-teal-500/5 text-foreground ring-1 ring-teal-500/20"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                Write a custom prompt...
              </button>

              {showCustom && (
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Describe how SuperBot should behave in this channel..."
                  className="mt-2 w-full rounded-lg border border-border/60 bg-background p-3 text-[13px] text-foreground placeholder-muted-foreground/50 outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all resize-none"
                  rows={3}
                  maxLength={2000}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <button
            onClick={handleClear}
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset to default
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
