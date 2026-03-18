"use client";

import { useAiStore } from "@/stores/ai-store";
import { AI_MAX_AGENT_STEPS } from "@superchat/shared";
import { cn } from "@/lib/utils";
import {
  Search,
  Clock,
  BarChart3,
  Gamepad2,
  Pin,
  Image,
  Bell,
  Brain,
  Loader2,
} from "lucide-react";

interface AgentStepIndicatorProps {
  messageId: string;
}

function getStepIcon(toolName?: string) {
  const cls = "h-3 w-3";
  switch (toolName) {
    case "searchMessages": return <Search className={cls} />;
    case "getCurrentTime": return <Clock className={cls} />;
    case "createPoll": return <BarChart3 className={cls} />;
    case "startGame": return <Gamepad2 className={cls} />;
    case "pinMessage": return <Pin className={cls} />;
    case "generateImage": return <Image className={cls} />;
    case "createReminder": return <Bell className={cls} />;
    default: return <Brain className={cls} />;
  }
}

function getStepLabel(step: number, toolName?: string, description?: string): string {
  if (description) return description;
  if (toolName) {
    const labels: Record<string, string> = {
      searchMessages: "Searching messages",
      getCurrentTime: "Checking time",
      createPoll: "Creating poll",
      startGame: "Starting game",
      pinMessage: "Pinning message",
      generateImage: "Generating image",
      createReminder: "Setting reminder",
    };
    return labels[toolName] ?? `Using ${toolName}`;
  }
  return `Thinking (step ${step})`;
}

export function AgentStepIndicator({ messageId }: AgentStepIndicatorProps) {
  const steps = useAiStore((s) => s.agentSteps.get(messageId));
  const stream = useAiStore((s) => s.streams.get(messageId));
  const isStreaming = stream?.isStreaming ?? false;

  if (!steps || steps.length === 0) return null;

  const latestStep = steps[steps.length - 1];
  const stepCount = latestStep.step;

  return (
    <div className="mt-1.5 mb-1">
      {/* Compact step progress */}
      <div className="flex items-center gap-2">
        {/* Step dots */}
        <div className="flex items-center gap-1">
          {Array.from({ length: AI_MAX_AGENT_STEPS }, (_, i) => {
            const completed = i < stepCount;
            const active = i === stepCount && isStreaming;
            return (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  completed ? "w-4 bg-teal-500" : active ? "w-4 bg-teal-400 animate-pulse" : "w-1.5 bg-border"
                )}
              />
            );
          })}
        </div>

        {/* Current step label */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {isStreaming ? (
            <Loader2 className="h-3 w-3 animate-spin text-teal-500" />
          ) : (
            getStepIcon(latestStep.toolName)
          )}
          <span>
            Step {stepCount}/{AI_MAX_AGENT_STEPS}: {getStepLabel(stepCount, latestStep.toolName, latestStep.description)}
          </span>
        </div>
      </div>
    </div>
  );
}
