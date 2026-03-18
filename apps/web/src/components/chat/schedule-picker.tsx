"use client";

import { useState, useCallback } from "react";
import { CalendarClock, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SchedulePickerProps {
  scheduledTime: Date | null;
  onSchedule: (time: Date | null) => void;
}

const QUICK_OPTIONS = [
  { label: "In 30 min", minutes: 30 },
  { label: "In 1 hour", minutes: 60 },
  { label: "In 2 hours", minutes: 120 },
  { label: "In 4 hours", minutes: 240 },
  { label: "Tomorrow 9 AM", minutes: -1 },
];

function getTomorrow9AM(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

export function SchedulePicker({ scheduledTime, onSchedule }: SchedulePickerProps) {
  const [open, setOpen] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");

  const handleQuickOption = useCallback(
    (minutes: number) => {
      if (minutes === -1) {
        onSchedule(getTomorrow9AM());
      } else {
        onSchedule(new Date(Date.now() + minutes * 60 * 1000));
      }
      setOpen(false);
    },
    [onSchedule]
  );

  const handleCustomSchedule = useCallback(() => {
    if (!customDate || !customTime) return;
    const dt = new Date(`${customDate}T${customTime}`);
    if (dt.getTime() <= Date.now()) return;
    onSchedule(dt);
    setOpen(false);
  }, [customDate, customTime, onSchedule]);

  const formatScheduledTime = (d: Date) => {
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Today ${time}`;
    if (isTomorrow) return `Tomorrow ${time}`;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
  };

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              scheduledTime
                ? "text-teal-600 bg-teal-500/10 hover:bg-teal-500/15 dark:text-teal-400"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <CalendarClock className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Schedule message</TooltipContent>
      </Tooltip>

      {scheduledTime && !open && (
        <div className="absolute bottom-full left-0 mb-1 flex items-center gap-1">
          <span className="whitespace-nowrap rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-medium text-teal-600 dark:text-teal-400">
            {formatScheduledTime(scheduledTime)}
          </span>
          <button
            onClick={() => onSchedule(null)}
            className="rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      )}

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-56 rounded-lg border border-border bg-popover p-1 shadow-xl animate-slide-up z-50">
          <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Schedule for
          </p>
          {QUICK_OPTIONS.map((option) => (
            <button
              key={option.label}
              onClick={() => handleQuickOption(option.minutes)}
              className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs text-popover-foreground hover:bg-accent transition-colors"
            >
              {option.label}
            </button>
          ))}

          <div className="my-1 h-px bg-border" />

          <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Custom
          </p>
          <div className="flex gap-1 px-2 pb-1">
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary/50"
            />
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="w-20 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary/50"
            />
          </div>
          <button
            onClick={handleCustomSchedule}
            disabled={!customDate || !customTime}
            className="mx-2 mb-1 w-[calc(100%-16px)] rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Schedule
          </button>

          {scheduledTime && (
            <button
              onClick={() => { onSchedule(null); setOpen(false); }}
              className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent transition-colors"
            >
              Remove schedule
            </button>
          )}
        </div>
      )}
    </div>
  );
}
