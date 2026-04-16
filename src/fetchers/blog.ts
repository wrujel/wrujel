interface BlogPost {
  title: string;
  slug: string;
  date: string;
  category: string;
  description: string;
  url: string;
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

    const lines: string[] = [];
    for (const post of json.posts) {
      lines.push(
        `- [**${post.title}**](${post.url}) — ${formatDate(post.date)} · \`${post.category}\``,
      );
    }
    return lines.join("\n");
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
