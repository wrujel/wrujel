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

interface LatestProject {
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  imageUrl: string;
  gifUrl?: string;
  url: string;
  homepage: string | null;
}

interface PortfolioApiResponse {
  projects: LatestProject[];
}

const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const PORTFOLIO_API = "https://wrujel.com/api/projects/latest";
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
  return `<img src="https://img.shields.io/badge/-${encodeURIComponent(lang)}-${color}?style=flat-square&logo=${encodeURIComponent(lang.toLowerCase())}&logoColor=white" alt="${lang}" height="18">`;
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

function renderProjectCards(projects: LatestProject[]): string {
  const COLS = 2;
  const rows: string[] = [];

  for (let i = 0; i < projects.length; i += COLS) {
    const chunk = projects.slice(i, i + COLS);
    const cells = chunk.map((p) => {
      const desc = p.description
        ? p.description.length > 80
          ? p.description.slice(0, 77) + "..."
          : p.description
        : "—";
      const lang = languageBadge(p.language) || p.language || "—";
      // Prefer the GIF, routed through wsrv.nl with n=30 to cap frames (the
      // raw Cloudinary GIFs can exceed both wsrv's 71M-pixel input limit and
      // GitHub camo's 5MB serve limit). output=webp shrinks the result so
      // camo will proxy and animate it.
      const imgSrc = isHttpUrl(p.gifUrl)
        ? `https://wsrv.nl/?url=${encodeURIComponent(p.gifUrl)}&w=600&h=300&fit=cover&n=30&output=webp`
        : isHttpUrl(p.imageUrl)
          ? `https://wsrv.nl/?url=${encodeURIComponent(p.imageUrl)}&w=600&h=300&fit=cover&output=webp`
          : "";
      const imgTag = imgSrc
        ? `<img src="${imgSrc}" alt="${p.name}" width="100%">`
        : `<img alt="${p.name}" width="100%">`;
      const linkUrl = isHttpUrl(p.url)
        ? p.url
        : isHttpUrl(p.homepage)
          ? p.homepage
          : "";
      const wrap = (inner: string) =>
        linkUrl ? `<a href="${linkUrl}">${inner}</a>` : inner;
      return [
        `<td align="center" valign="top" width="50%">`,
        wrap(imgTag),
        `<br/>`,
        wrap(`<b>${p.name}</b>`),
        `<br/><sub>${desc}</sub>`,
        `<br/><br/>`,
        `<sub>⭐ ${p.stars} &nbsp;•&nbsp; 🍴 ${p.forks} &nbsp;•&nbsp; ${lang}</sub>`,
        `</td>`,
      ].join("\n");
    });

    if (chunk.length < COLS) {
      cells.push(`<td width="50%"></td>`);
    }

    rows.push(`<tr>\n${cells.join("\n")}\n</tr>`);
  }

  return [
    "### 🚀 Featured Projects",
    "",
    "<table>",
    rows.join("\n"),
    "</table>",
    "",
    `<p align="right"><a href="https://wrujel.com/projects">🚀 More Projects →</a></p>`,
  ].join("\n");
}

export async function fetchFeaturedProjects(): Promise<string> {
  // Primary: portfolio API (has project images + same ordering as /projects page)
  try {
    const res = await fetch(PORTFOLIO_API, {
      headers: { "User-Agent": "wrujel-profile-readme" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as PortfolioApiResponse;
    const projects = json.projects ?? [];
    if (projects.length > 0) {
      return renderProjectCards(projects);
    }
  } catch (err) {
    console.warn("Portfolio API unavailable, falling back to GitHub GraphQL:", err);
  }

  // Fallback: GitHub GraphQL with GitHub OG images
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
    const repos = json.data.user.repositories.nodes
      .filter((r) => r.name !== USERNAME)
      .slice(0, 5);

    const projects: LatestProject[] = repos.map((r) => ({
      name: r.name,
      description: r.description,
      stars: r.stargazerCount,
      forks: r.forkCount,
      language: r.primaryLanguage?.name ?? null,
      imageUrl: `https://opengraph.githubassets.com/1/${USERNAME}/${r.name}`,
      url: r.url,
      homepage: null,
    }));

    return renderProjectCards(projects);
  } catch (err) {
    console.error("Failed to fetch GitHub repos:", err);
    return "";
  }
}
