interface DifficultyBreakdown {
  difficulty: string;
  solved: number;
  total: number;
  solvedPct: number;
}

interface LanguageDistribution {
  language: string;
  count: number;
  pct: number;
}

interface TopTag {
  tag: string;
  total: number;
}

interface InsightsSummary {
  total: number;
  solved: number;
  avgAcceptanceRate: number;
  uniqueLanguages: number;
  uniqueTags: number;
  optimalRate: number;
}

interface InsightsResponse {
  success: boolean;
  data: {
    summary: InsightsSummary;
    difficultyBreakdown: DifficultyBreakdown[];
    topTags: TopTag[];
    languageDistribution: LanguageDistribution[];
  };
}

const LEETCODE_API = "https://leetcode-tracker-qvf.pages.dev/api/insights";

function progressBar(value: number, max: number, length = 20): string {
  const filled = Math.round((value / max) * length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function difficultyEmoji(difficulty: string): string {
  switch (difficulty) {
    case "Easy":
      return "🟢";
    case "Medium":
      return "🟡";
    case "Hard":
      return "🔴";
    default:
      return "⚪";
  }
}

function languageEmoji(lang: string): string {
  const map: Record<string, string> = {
    rust: "🦀",
    typescript: "🔷",
    python: "🐍",
    pandas: "🐼",
    sql: "🗃️",
    cpp: "⚡",
    bash: "🐚",
    java: "☕",
    javascript: "🟨",
  };
  return map[lang.toLowerCase()] ?? "📝";
}

export async function fetchLeetCodeInsights(): Promise<string> {
  try {
    const res = await fetch(LEETCODE_API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = (await res.json()) as InsightsResponse;
    if (!json.success) throw new Error("API returned unsuccessful");

    const { summary, difficultyBreakdown, topTags, languageDistribution } =
      json.data;

    const lines: string[] = [];

    // Header
    lines.push("### 🧩 LeetCode Insights");
    lines.push("");
    lines.push(
      `> **${summary.solved}** problems solved | **${summary.uniqueLanguages}** languages | **${summary.uniqueTags}** topics | **${summary.avgAcceptanceRate}%** avg acceptance`,
    );
    lines.push("");

    // Difficulty breakdown
    lines.push("#### Difficulty Breakdown");
    lines.push("");
    lines.push("| Difficulty | Solved | Progress |");
    lines.push("|:-----------|-------:|:---------|");
    for (const d of difficultyBreakdown) {
      const bar = progressBar(d.solved, d.total);
      const pct = d.total > 0 ? ((d.solved / d.total) * 100).toFixed(1) : "0.0";
      lines.push(
        `| ${difficultyEmoji(d.difficulty)} ${d.difficulty} | ${d.solved}/${d.total} | \`${bar}\` ${pct}% |`,
      );
    }
    lines.push("");

    // Top languages
    lines.push("#### Top Languages");
    lines.push("");
    const topLangs = languageDistribution.slice(0, 5);
    lines.push("| Language | Problems | Share |");
    lines.push("|:---------|--------:|------:|");
    for (const l of topLangs) {
      lines.push(
        `| ${languageEmoji(l.language)} ${l.language.charAt(0).toUpperCase() + l.language.slice(1)} | ${l.count} | ${l.pct}% |`,
      );
    }
    lines.push("");

    lines.push(
      `<p align="right"><a href="https://leetcode-tracker-qvf.pages.dev/">📊 Full Dashboard →</a></p>`,
    );

    return lines.join("\n");
  } catch (err) {
    console.error("Failed to fetch LeetCode insights:", err);
    return [
      "### 🧩 LeetCode Insights",
      "",
      "> Stats temporarily unavailable. Visit the [full dashboard](https://leetcode-tracker-qvf.pages.dev/) for details.",
    ].join("\n");
  }
}
