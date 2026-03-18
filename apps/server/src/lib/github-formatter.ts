interface GitHubEvent {
  action?: string;
  [key: string]: unknown;
}

export function formatGitHubEvent(eventType: string, payload: GitHubEvent): string {
  switch (eventType) {
    case "push": {
      const p = payload as any;
      const repo = p.repository?.full_name ?? "unknown";
      const branch = (p.ref as string)?.replace("refs/heads/", "") ?? "unknown";
      const commits = (p.commits as any[]) ?? [];
      const pusher = p.pusher?.name ?? "someone";
      const lines = [`**${pusher}** pushed ${commits.length} commit${commits.length !== 1 ? "s" : ""} to \`${branch}\` on **${repo}**`];
      for (const c of commits.slice(0, 5)) {
        const sha = (c.id as string).slice(0, 7);
        lines.push(`- [\`${sha}\`](${c.url}) ${c.message}`);
      }
      if (commits.length > 5) lines.push(`- ... and ${commits.length - 5} more`);
      return lines.join("\n");
    }

    case "pull_request": {
      const p = payload as any;
      const pr = p.pull_request;
      const repo = p.repository?.full_name ?? "unknown";
      const action = p.action ?? "updated";
      return `**PR ${action}** on **${repo}**: [#${pr.number} ${pr.title}](${pr.html_url}) by ${pr.user?.login}`;
    }

    case "issues": {
      const p = payload as any;
      const issue = p.issue;
      const repo = p.repository?.full_name ?? "unknown";
      const action = p.action ?? "updated";
      return `**Issue ${action}** on **${repo}**: [#${issue.number} ${issue.title}](${issue.html_url}) by ${issue.user?.login}`;
    }

    case "release": {
      const p = payload as any;
      const release = p.release;
      const repo = p.repository?.full_name ?? "unknown";
      return `**New release** on **${repo}**: [${release.tag_name}](${release.html_url}) — ${release.name || "No title"}`;
    }

    default:
      return `**GitHub event**: \`${eventType}\` ${payload.action ? `(${payload.action})` : ""}`;
  }
}
