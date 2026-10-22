interface MonitoredProject {
  repo: string;
  url: string;
}

// monitor-repos tracks where every project is deployed — the "Project" links
// in its README are rendered from this file — so a project that moves hosts
// only has to be updated there.
const MONITOR_REPOS_PROJECTS =
  "https://raw.githubusercontent.com/wrujel/monitor-repos/main/data/projects.json";

/**
 * Live URL of a project tracked by monitor-repos, without a trailing slash.
 * Throws when monitor-repos is unreachable or has no URL for the project, so
 * the build keeps that section's last-good content.
 */
export async function getProjectUrl(repo: string): Promise<string> {
  const res = await fetch(MONITOR_REPOS_PROJECTS);
  if (!res.ok) throw new Error(`monitor-repos: HTTP ${res.status}`);

  const projects = (await res.json()) as MonitoredProject[];
  const url = projects.find((p) => p.repo === repo)?.url;
  if (!url) throw new Error(`monitor-repos has no URL for ${repo}`);

  return url.replace(/\/+$/, "");
}
