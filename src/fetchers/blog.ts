interface BlogPost {
  title: string;
  slug: string;
  date: string;
  category: string;
  description: string;
  url: string;
  readingTime?: number;
  image?: string | null;
}

interface BlogApiResponse {
  posts: BlogPost[];
}

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
}

const BLOG_API = "https://blog.wrujel.com/api/latest";
const BLOG_RSS = "https://blog.wrujel.com/feed.xml";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getThumbUrl(url: string): string {
  return url.replace("/upload/", "/upload/w_72,h_72,c_fill/");
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title =
      block.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/)?.[1] ??
      block.match(/<title>(.*?)<\/title>/)?.[1] ??
      "";
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
    if (title && link) {
      items.push({ title, link, pubDate });
    }
  }
  return items.slice(0, 5);
}

async function fetchFromApi(): Promise<string | null> {
  try {
    const res = await fetch(BLOG_API);
    if (!res.ok) return null;

    const json = (await res.json()) as BlogApiResponse;
    if (!json.posts?.length) return null;

    const rows: string[] = [];
    for (const post of json.posts) {
      const thumb = isHttpUrl(post.image)
        ? `<a href="${post.url}"><img src="${getThumbUrl(post.image)}" width="72" height="72" /></a>`
        : `<a href="${post.url}">📝</a>`;

      const metaParts: string[] = [];
      if (post.date) metaParts.push(`<sub>📅 ${formatDate(post.date)}</sub>`);
      if (post.category) metaParts.push(`<sub><code>${post.category}</code></sub>`);
      if (post.readingTime) metaParts.push(`<sub>⏱ ${post.readingTime} min read</sub>`);
      const meta = metaParts.join("<br>");

      rows.push(
        `  <tr>\n` +
        `    <td width="76" align="center" valign="top">${thumb}</td>\n` +
        `    <td valign="top"><a href="${post.url}"><b>${post.title}</b></a><br><sub>${truncate(post.description, 80)}</sub></td>\n` +
        `    <td align="right" valign="top">${meta}</td>\n` +
        `  </tr>\n` +
        `  <tr><td colspan="3" height="6"></td></tr>`,
      );
    }

    return `<table width="100%">\n${rows.join("\n")}\n</table>`;
  } catch {
    return null;
  }
}

async function fetchFromRss(): Promise<string | null> {
  try {
    const res = await fetch(BLOG_RSS);
    if (!res.ok) return null;

    const xml = await res.text();
    const items = parseRssItems(xml);
    if (!items.length) return null;

    const lines: string[] = [];
    for (const item of items) {
      const date = item.pubDate ? ` — ${formatDate(item.pubDate)}` : "";
      lines.push(`- [**${item.title}**](${item.link})${date}`);
    }
    return lines.join("\n");
  } catch {
    return null;
  }
}

export async function fetchBlogPosts(): Promise<string> {
  const lines: string[] = ["### ✍️ Latest Blog Posts", ""];

  const content = (await fetchFromApi()) ?? (await fetchFromRss());

  if (content) {
    lines.push(content);
  } else {
    throw new Error("Failed to fetch blog posts from API and RSS feed");
  }

  lines.push("");
  lines.push(
    `<p align="right"><a href="https://blog.wrujel.com/">📖 Read more →</a></p>`,
  );

  return lines.join("\n");
}
