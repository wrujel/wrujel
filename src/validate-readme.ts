import { readFile, access } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const README_PATH = join(ROOT, "README.md");

// Known fallback strings that signal an API failure at build time
const FALLBACK_STRINGS: string[] = [
  "Blog posts coming soon!",
  "Stats temporarily unavailable"
];

// The GitHub fallback uses a 3-column table instead of the live 5-column table
const GITHUB_FALLBACK_MARKER = "| Project | Description | Language |";

// Sections that must be present and contain at least minChars of content
const SECTIONS = [
  {
    name: "PROJECTS",
    start: "<!-- PROJECTS_START -->",
    end: "<!-- PROJECTS_END -->",
    minChars: 200
  },
  {
    name: "BLOG",
    start: "<!-- BLOG_START -->",
    end: "<!-- BLOG_END -->",
    minChars: 100
  },
  {
    name: "LEETCODE",
    start: "<!-- LEETCODE_START -->",
    end: "<!-- LEETCODE_END -->",
    minChars: 200
  }
];

async function main() {
  console.log("🔍 Validating README.md...\n");

  const readme = await readFile(README_PATH, "utf-8");
  let errors = 0;

  // 1. Section presence and minimum content check
  for (const { name, start, end, minChars } of SECTIONS) {
    const startIdx = readme.indexOf(start);
    const endIdx = readme.indexOf(end);

    if (startIdx === -1 || endIdx === -1) {
      console.error(`❌ ${name}: section markers not found`);
      errors++;
      continue;
    }

    const content = readme.slice(startIdx + start.length, endIdx).trim();
    if (content.length < minChars) {
      console.error(
        `❌ ${name}: content too short (${content.length} chars, min ${minChars})`
      );
      errors++;
      continue;
    }

    console.log(`✅ ${name}: ${content.length} chars`);
  }

  // 2. Fallback string detection
  for (const fallback of FALLBACK_STRINGS) {
    if (readme.includes(fallback)) {
      console.error(`❌ Fallback content detected: "${fallback}"`);
      errors++;
    }
  }

  // 3. GitHub API fallback detection (3-column table = static list, no live star/fork counts)
  if (readme.includes(GITHUB_FALLBACK_MARKER)) {
    console.error(
      "❌ GitHub projects: static fallback list detected (API likely failed)"
    );
    errors++;
  }

  // 4. Reject any src/href/srcset that isn't an http(s) URL, anchor, or known
  // local asset. Catches accidental "null"/"undefined"/empty values from APIs
  // before lychee chokes on them as file:// paths.
  const urlAttrRegex = /\b(?:src|href|srcset)\s*=\s*"([^"]*)"/gi;
  const ALLOWED_LOCAL = new Set(["./profile-3d-contrib/profile-night-green.svg"]);
  const badAttrs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = urlAttrRegex.exec(readme)) !== null) {
    const value = m[1].trim();
    if (!value) {
      badAttrs.push(`empty: ${m[0]}`);
      continue;
    }
    if (value.startsWith("#") || value.startsWith("mailto:")) continue;
    if (ALLOWED_LOCAL.has(value)) continue;
    if (/^https?:\/\//i.test(value)) continue;
    badAttrs.push(m[0]);
  }
  if (badAttrs.length) {
    console.error(`❌ Invalid URL attributes (${badAttrs.length}):`);
    for (const bad of badAttrs.slice(0, 10)) console.error(`   ${bad}`);
    errors++;
  }

  // 4. Local 3D contribution SVG check (soft warning — separate workflow generates it)
  const svgPath = join(ROOT, "profile-3d-contrib", "profile-night-green.svg");
  try {
    await access(svgPath);
    console.log("✅ 3D contribution SVG: present");
  } catch {
    console.warn(
      "⚠️  3D contribution SVG: missing (3d-contrib workflow may not have run yet)"
    );
  }

  if (errors > 0) {
    console.error(`\n❌ Validation failed with ${errors} error(s)`);
    process.exit(1);
  }

  console.log("\n✅ README validation passed");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
