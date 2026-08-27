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

function extractSection(
  content: string,
  startMarker: string,
  endMarker: string,
): string | null {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null;

  const body = content.slice(startIdx + startMarker.length, endIdx).trim();
  return body.length > 0 ? body : null;
}

function sectionName(startMarker: string): string {
  return startMarker.replace(/<!-- |_START -->/g, "");
}

type SectionResult =
  | { section: Section; ok: true; content: string }
  | { section: Section; ok: false; error: unknown };

async function main() {
  console.log("📝 Building README.md...\n");

  // README.template.md is always the base, so edits to the static layout take
  // effect on every build. The previous README.md is read only to restore
  // last-good content for a section whose fetcher fails.
  const template = await readFile(TEMPLATE_PATH, "utf-8");

  let previous = "";
  try {
    previous = await readFile(OUTPUT_PATH, "utf-8");
  } catch {
    console.log("📄 No existing README.md — nothing to fall back on\n");
  }

  // Settle every section individually so a failure still tells us which
  // section it came from, and can be restored from the previous output.
  const results: SectionResult[] = await Promise.all(
    sections.map(async (section): Promise<SectionResult> => {
      try {
        return { section, ok: true, content: await section.fetcher() };
      } catch (error) {
        return { section, ok: false, error };
      }
    }),
  );

  let readme = template;
  let restored = 0;
  let lost = 0;

  for (const result of results) {
    const { startMarker, endMarker } = result.section;
    const name = sectionName(startMarker);

    if (result.ok) {
      console.log(`✅ ${name}`);
      readme = replaceSection(readme, startMarker, endMarker, result.content);
      continue;
    }

    console.error(`❌ ${name} failed:`, result.error);

    const lastGood = extractSection(previous, startMarker, endMarker);
    if (lastGood) {
      restored++;
      console.warn(`   ↩️  ${name}: reused last-good content`);
      readme = replaceSection(readme, startMarker, endMarker, lastGood);
    } else {
      lost++;
      console.warn(`   ⚠️  ${name}: no previous content to fall back on`);
    }
  }

  await writeFile(OUTPUT_PATH, readme, "utf-8");
  console.log(`\n🎉 README.md generated at ${OUTPUT_PATH}`);

  if (restored > 0 || lost > 0) {
    console.log(
      `   ${restored} section(s) restored from last-good, ${lost} left empty`,
    );
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
