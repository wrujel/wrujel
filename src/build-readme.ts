import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchLeetCodeInsights } from "./fetchers/leetcode";
import { fetchBlogPosts } from "./fetchers/blog";
import { fetchFeaturedProjects } from "./fetchers/github";

const ROOT = join(import.meta.dir, "..");
const TEMPLATE_PATH = join(ROOT, "README.template.md");
const OUTPUT_PATH = join(ROOT, "README.md");

type Section = {
  startMarker: string;
  endMarker: string;
  fetcher: () => Promise<string>;
};

const sections: Section[] = [
  {
    startMarker: "<!-- LEETCODE_START -->",
    endMarker: "<!-- LEETCODE_END -->",
    fetcher: fetchLeetCodeInsights,
  },
  {
    startMarker: "<!-- BLOG_START -->",
    endMarker: "<!-- BLOG_END -->",
    fetcher: fetchBlogPosts,
  },
  {
    startMarker: "<!-- PROJECTS_START -->",
    endMarker: "<!-- PROJECTS_END -->",
    fetcher: fetchFeaturedProjects,
  },
];

function replaceSection(
  content: string,
  startMarker: string,
  endMarker: string,
  replacement: string,
): string {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.warn(`Markers not found: ${startMarker} / ${endMarker}`);
    return content;
  }

  return (
    content.slice(0, startIdx + startMarker.length) +
    "\n" +
    replacement +
    "\n" +
    content.slice(endIdx)
  );
}

async function main() {
  console.log("📝 Building README.md...\n");

  const template = await readFile(TEMPLATE_PATH, "utf-8");

  // Fetch all sections in parallel
  const results = await Promise.allSettled(
    sections.map(async (s) => ({
      ...s,
      content: await s.fetcher(),
    })),
  );

  let readme = template;

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { startMarker, endMarker, content } = result.value;
      console.log(`✅ ${startMarker.replace(/<!-- |_START -->/g, "")}`);
      readme = replaceSection(readme, startMarker, endMarker, content);
    } else {
      console.error(`❌ Section failed:`, result.reason);
    }
  }

  await writeFile(OUTPUT_PATH, readme, "utf-8");
  console.log(`\n🎉 README.md generated at ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
