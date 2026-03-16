const MAX_INPUT_LENGTH = 4000;

/**
 * Patterns commonly used in prompt injection attempts.
 */
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /ignore\s+(all\s+)?above\s+instructions/gi,
  /disregard\s+(all\s+)?previous/gi,
  /forget\s+(all\s+)?previous/gi,
  /you\s+are\s+now\s+(?:a|an)\s+/gi,
  /new\s+system\s+prompt/gi,
  /override\s+system/gi,
  /\bsystem\s*:\s*/gi,
  /\[system\]/gi,
  /\<\s*system\s*\>/gi,
  /```\s*system/gi,
  /act\s+as\s+(?:if\s+)?(?:you\s+(?:are|were)\s+)?/gi,
  /pretend\s+(?:you\s+are|to\s+be)/gi,
  /jailbreak/gi,
  /do\s+anything\s+now/gi,
  /DAN\s+mode/gi,
];

/**
 * Sanitize user input before passing to an AI model.
 * Strips common prompt injection patterns, truncates to max length, and escapes control chars.
 */
export function sanitizeForAi(text: string): string {
  let sanitized = text.slice(0, MAX_INPUT_LENGTH);

  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[filtered]");
  }

  // Remove null bytes and other control characters (keep newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return sanitized.trim();
}
