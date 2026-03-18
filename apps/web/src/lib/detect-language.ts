/** Heuristic language detection for code blocks without explicit language tags */
export function detectLanguage(code: string): string | null {
  const trimmed = code.trim();

  // TypeScript / JavaScript
  if (/^import\s+.+\s+from\s+['"]/.test(trimmed)) return "typescript";
  if (/^export\s+(default\s+)?(function|class|const|interface|type)\s/.test(trimmed)) return "typescript";
  if (/^(const|let|var)\s+\w+\s*[:=]/.test(trimmed)) return "typescript";
  if (/=>\s*[{(]/.test(trimmed)) return "typescript";
  if (/^(async\s+)?function\s+\w+/.test(trimmed)) return "javascript";
  if (/console\.(log|error|warn)\(/.test(trimmed)) return "javascript";

  // Python
  if (/^(def|class)\s+\w+/.test(trimmed)) return "python";
  if (/^import\s+\w+$/.test(trimmed.split("\n")[0])) return "python";
  if (/^from\s+\w+\s+import\s+/.test(trimmed)) return "python";
  if (/print\(/.test(trimmed) && !/console\./.test(trimmed)) return "python";

  // Go
  if (/^package\s+\w+/.test(trimmed)) return "go";
  if (/^func\s+(\(.*?\)\s+)?\w+/.test(trimmed)) return "go";
  if (/:=/.test(trimmed) && /func/.test(trimmed)) return "go";

  // Rust
  if (/^(fn|pub\s+fn|impl|struct|enum|trait|mod|use\s+)\s/.test(trimmed)) return "rust";
  if (/let\s+mut\s+/.test(trimmed)) return "rust";

  // C / C++
  if (/^#include\s+[<"]/.test(trimmed)) return "c";
  if (/^(int|void|char|float|double)\s+\w+\s*\(/.test(trimmed)) return "c";

  // Java
  if (/^(public|private|protected)\s+(static\s+)?(void|int|String|class)\s/.test(trimmed)) return "java";

  // SQL
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i.test(trimmed)) return "sql";

  // HTML
  if (/^<(!DOCTYPE|html|head|body|div|span|p|a|img)\b/i.test(trimmed)) return "html";

  // CSS
  if (/^(\.|#|@media|@keyframes|body|html)\s*\{/.test(trimmed)) return "css";
  if (/^\w+\s*\{[\s\S]*:\s*.+;/.test(trimmed)) return "css";

  // Shell / Bash
  if (/^#!/.test(trimmed)) return "bash";
  if (/^\$\s/.test(trimmed)) return "bash";
  if (/^(npm|pnpm|yarn|pip|cargo|go|docker|git|curl|wget)\s/.test(trimmed)) return "bash";

  // JSON
  if (/^\s*[{[]/.test(trimmed) && /[}\]]\s*$/.test(trimmed)) {
    try { JSON.parse(trimmed); return "json"; } catch { /* not json */ }
  }

  // YAML
  if (/^\w+:\s*.+$/m.test(trimmed) && !/:=/.test(trimmed)) {
    const lines = trimmed.split("\n");
    if (lines.length >= 2 && lines.every((l) => /^\s*(\w[\w-]*:\s|#|-\s)/.test(l) || l.trim() === "")) {
      return "yaml";
    }
  }

  return null;
}
