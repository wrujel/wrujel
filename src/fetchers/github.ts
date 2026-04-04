interface RepoNode {
  name: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string } | null;
}

interface GraphQLResponse {
  data: {
    user: {
      repositories: {
        nodes: RepoNode[];
      };
    };
  };
}

const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const USERNAME = "wrujel";

const QUERY = `
query {
  user(login: "${USERNAME}") {
    repositories(
      first: 10,
      orderBy: { field: STARGAZERS, direction: DESC },
      ownerAffiliations: OWNER,
      privacy: PUBLIC
    ) {
      nodes {
        name
        description
        url
        stargazerCount
        forkCount
        primaryLanguage { name }
      }
    }
  }
}
`;

function languageBadge(lang: string | null): string {
  if (!lang) return "";
  const colors: Record<string, string> = {
    TypeScript: "3178C6",
    JavaScript: "F7DF1E",
    Rust: "DEA584",
    Python: "3776AB",
    Astro: "FF5D01",
    HTML: "E34F26",
    CSS: "1572B6",
  };
  const color = colors[lang] ?? "555";
  return `![${lang}](https://img.shields.io/badge/-${encodeURIComponent(lang)}-${color}?style=flat-square&logo=${encodeURIComponent(lang.toLowerCase())}&logoColor=white)`;
}

export async function fetchFeaturedProjects(): Promise<string> {
  const token = process.env.GH_TOKEN;

  try {
    if (!token) throw new Error("GH_TOKEN not set");

    const res = await fetch(GITHUB_GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "wrujel-profile-readme",
      },
      body: JSON.stringify({ query: QUERY }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = (await res.json()) as GraphQLResponse;
    const repos = json.data.user.repositories.nodes.filter(
      (r) => r.name !== USERNAME,
    );

    const lines: string[] = [
      "### 🚀 Featured Projects",
      "",
      "| Project | Description | Stars | Forks | Language |",
      "|:--------|:------------|------:|------:|:---------|",
    ];

    for (const repo of repos.slice(0, 6)) {
      const desc = repo.description
        ? repo.description.length > 60
          ? repo.description.slice(0, 57) + "..."
          : repo.description
        : "—";
      const lang = languageBadge(repo.primaryLanguage?.name ?? null);
      lines.push(
        `| [${repo.name}](${repo.url}) | ${desc} | ⭐ ${repo.stargazerCount} | 🍴 ${repo.forkCount} | ${lang} |`,
      );
    }

    return lines.join("\n");
  } catch (err) {
    console.error("Failed to fetch GitHub repos:", err);
    // Fallback: static list of known pinned repos
    const lines = [
      "### 🚀 Featured Projects",
      "",
      "| Project | Description | Language |",
      "|:--------|:------------|:---------|",
      `| [airbnb-clone](https://github.com/wrujel/airbnb-clone) | Airbnb app clone with Next.js 13 | ${languageBadge("TypeScript")} |`,
      `| [netflix-clone](https://github.com/wrujel/netflix-clone) | Netflix-inspired app with Next.js | ${languageBadge("TypeScript")} |`,
      `| [portfolio-web-template](https://github.com/wrujel/portfolio-web-template) | Web portfolio using Next.js 14 | ${languageBadge("TypeScript")} |`,
      `| [tesla-landing](https://github.com/wrujel/tesla-landing) | Tesla landing with Astro | ${languageBadge("Astro")} |`,
      `| [tetris-javascript](https://github.com/wrujel/tetris-javascript) | Classic Tetris built with JS | ${languageBadge("JavaScript")} |`,
      `| [github-history](https://github.com/wrujel/github-history) | GitHub commits & branches viewer | ${languageBadge("TypeScript")} |`,
    ];
    return lines.join("\n");
  }
}
