import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_TOTAL = 592;
const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceArgument = process.argv[2] || process.env.KREA2_SOURCE_JSON;
if (!sourceArgument) {
  throw new Error("Usage: node tools/build-data.mjs <path-to-background_presets.json>");
}
const sourceJsonPath = path.resolve(sourceArgument);
const sourceThumbnailRoot = path.join(path.dirname(sourceJsonPath), "thumbnails");
const targetJsonPath = path.join(extensionRoot, "data", "background_presets.json");
const targetThumbnailRoot = path.join(extensionRoot, "assets", "thumbnails");

const manual = {
  apartment_balcony: {
    group: "Outdoor",
    tags: "scenery, balcony, railing, potted_plant, cityscape, outdoors, daylight",
  },
  bookstore_aisle: {
    group: "Indoor",
    tags: "scenery, bookstore, bookshelf, books, aisle, indoors, soft_lighting",
  },
  ramen_yatai: {
    group: "Japanese",
    tags: "scenery, yatai, ramen, food_stall, lantern, street, night",
  },
  showa_station_waiting_room: {
    group: "Japanese",
    tags: "scenery, train_station, waiting_room, wooden_bench, stove, retro, japan",
  },
  undersea: {
    group: "Fantasy & Sci-Fi",
    tags: "scenery, underwater, ocean_floor, coral, bubbles, light_rays, blue_theme",
  },
  forest_path: {
    group: "Outdoor",
    tags: "scenery, forest, path, trees, moss, sunlight, outdoors",
  },
  tropical_beach: {
    group: "Outdoor",
    tags: "scenery, beach, white_sand, ocean, palm_tree, blue_sky, tropical",
  },
  dungeon_interior: {
    group: "Fantasy & Sci-Fi",
    tags: "scenery, dungeon, stone_wall, archway, torch, dim_lighting, fantasy",
  },
  spaceship_cargo_hold: {
    group: "Fantasy & Sci-Fi",
    tags: "scenery, spaceship_interior, cargo_hold, crates, metal_floor, industrial, science_fiction",
  },
  tokyo_shibuya_crossing: {
    group: "Japanese",
    tags: "scenery, shibuya, scramble_crossing, crosswalk, cityscape, billboard, skyscraper, intersection",
  },
};

const groupKeywords = [
  [
    "Japanese",
    [
      "japan", "japanese", "tokyo", "kyoto", "osaka", "shibuya", "shinjuku", "akihabara",
      "showa", "edo", "ramen", "yatai", "izakaya", "sushi", "tatami", "ryokan", "onsen",
      "torii", "shrine", "samurai", "kabuki", "dojo",
    ],
  ],
  [
    "Fantasy & Sci-Fi",
    [
      "fantasy", "sci fi", "science fiction", "cyberpunk", "futuristic", "spaceship", "spacecraft",
      "space station", "alien", "dungeon", "medieval", "castle", "palace", "throne", "magic",
      "magical", "dragon", "underwater", "undersea", "steampunk", "post apocalyptic",
    ],
  ],
  [
    "Indoor",
    [
      "indoor", "inside", "interior", "room", "kitchen", "bedroom", "bathroom", "office", "studio",
      "hall", "corridor", "hallway", "lobby", "cafe", "restaurant", "shop", "store", "library",
      "classroom", "warehouse", "factory", "garage", "bar", "museum", "theater", "theatre", "church",
      "apartment", "house", "hotel", "gym", "workshop", "laboratory", "lab",
    ],
  ],
  [
    "Outdoor",
    [
      "outdoor", "outside", "exterior", "street", "road", "path", "beach", "forest", "mountain", "park",
      "garden", "field", "river", "lake", "ocean", "coast", "rooftop", "balcony", "platform", "plaza",
      "alley", "cityscape", "bridge", "harbor", "harbour", "countryside", "village", "sky", "desert",
    ],
  ],
];

const droppedWords = new Set([
  "a", "an", "the", "of", "from", "in", "on", "at", "to", "for", "background", "realistic",
  "photorealistic", "scene", "setting", "clear", "usable", "composition", "details", "atmosphere",
  "main", "person", "people", "human", "subject", "readable", "text", "logo", "logos",
]);

function normalizedWords(value) {
  return ` ${value.toLowerCase().replace(/[_-]+/g, " ").replace(/[^a-z0-9]+/g, " ").trim()} `;
}

function includesKeyword(value, keyword) {
  const normalizedKeyword = keyword.replace(/[_-]+/g, " ");
  return normalizedWords(value).includes(` ${normalizedKeyword} `);
}

function classifyGroup(preset) {
  const value = `${preset.name} ${preset.text}`;
  for (const [group, keywords] of groupKeywords) {
    if (keywords.some((keyword) => includesKeyword(value, keyword))) return group;
  }
  return "Outdoor";
}

function toTag(value) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word && !droppedWords.has(word))
    .slice(0, 4)
    .join("_");
}

function generateTags(preset) {
  const tags = ["scenery"];
  const clauses = [
    preset.name,
    ...preset.text
      .split(/[.,;:]+/)
      .flatMap((part) => part.split(/\b(?:with|and|or)\b/i)),
  ];

  for (const clause of clauses) {
    const value = clause.trim();
    if (!value || /\b(?:no|not|without|exclude|excluding)\b/i.test(value)) continue;
    const tag = toTag(value);
    if (!tag || tags.includes(tag)) continue;
    tags.push(tag);
    if (tags.length === 8) break;
  }

  return tags.join(", ");
}

function duplicates(values) {
  const seen = new Set();
  const duplicateValues = new Set();
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) duplicateValues.add(value);
    seen.add(key);
  }
  return [...duplicateValues];
}

async function mapLimit(items, limit, callback) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      await callback(item);
    }
  });
  await Promise.all(workers);
}

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function inspectSource(source) {
  if (!Array.isArray(source.presets) || source.presets.length !== EXPECTED_TOTAL) {
    throw new Error(`Expected ${EXPECTED_TOTAL} source presets, found ${source.presets?.length ?? 0}.`);
  }

  const rows = source.presets.map((preset) => {
    if (!preset.name || !preset.thumbnail || !preset.text) {
      throw new Error(`Invalid source preset: ${JSON.stringify(preset)}`);
    }
    if (path.basename(preset.thumbnail) !== preset.thumbnail || path.extname(preset.thumbnail).toLowerCase() !== ".webp") {
      throw new Error(`Invalid thumbnail path: ${preset.thumbnail}`);
    }
    const id = path.parse(preset.thumbnail).name;
    const override = manual[id];
    return {
      id,
      name: preset.name,
      group: override?.group ?? classifyGroup(preset),
      thumbnail: preset.thumbnail,
      text: preset.text,
      tags: override?.tags ?? generateTags(preset),
      sourcePath: path.join(sourceThumbnailRoot, preset.thumbnail),
    };
  });

  const duplicateIds = duplicates(rows.map((row) => row.id));
  const duplicateNames = duplicates(rows.map((row) => row.name));
  const missing = [];
  await mapLimit(rows, 24, async (row) => {
    try {
      await stat(row.sourcePath);
    } catch {
      missing.push(row.thumbnail);
    }
  });

  console.log(`[source] referenced=${rows.length} duplicate_ids=${duplicateIds.length} duplicate_names=${duplicateNames.length} missing_images=${missing.length}`);
  if (duplicateIds.length || duplicateNames.length || missing.length) {
    throw new Error(`Source validation failed. duplicate_ids=${duplicateIds.join(",")} duplicate_names=${duplicateNames.join(",")} missing=${missing.join(",")}`);
  }
  return rows;
}

async function build() {
  const source = JSON.parse(await readFile(sourceJsonPath, "utf8"));
  const rows = await inspectSource(source);
  const expectedThumbnails = new Set(rows.map((row) => row.thumbnail.toLowerCase()));

  await mkdir(path.dirname(targetJsonPath), { recursive: true });
  await mkdir(targetThumbnailRoot, { recursive: true });

  const existingFiles = await readdir(targetThumbnailRoot, { withFileTypes: true });
  await Promise.all(existingFiles
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".webp" && !expectedThumbnails.has(entry.name.toLowerCase()))
    .map((entry) => rm(path.join(targetThumbnailRoot, entry.name))));

  await mapLimit(rows, 16, async (row) => {
    await copyFile(row.sourcePath, path.join(targetThumbnailRoot, row.thumbnail));
  });

  const output = {
    version: source.version,
    description: "Background Prompter catalog for Forge Neo and ReForge.",
    total_available: rows.length,
    presets: rows.map(({ sourcePath, ...preset }) => preset),
  };
  await writeFile(targetJsonPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  const written = JSON.parse(await readFile(targetJsonPath, "utf8"));
  const targetFiles = (await readdir(targetThumbnailRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".webp")
    .map((entry) => entry.name);
  const targetSet = new Set(targetFiles.map((name) => name.toLowerCase()));
  const missingTarget = rows.filter((row) => !targetSet.has(row.thumbnail.toLowerCase()));
  const extraTarget = targetFiles.filter((name) => !expectedThumbnails.has(name.toLowerCase()));
  const duplicateIds = duplicates(written.presets.map((preset) => preset.id));
  const duplicateNames = duplicates(written.presets.map((preset) => preset.name));
  const mismatched = [];
  let totalBytes = 0;

  await mapLimit(rows, 12, async (row) => {
    const targetPath = path.join(targetThumbnailRoot, row.thumbnail);
    const [sourceHash, targetHash, targetStat] = await Promise.all([
      sha256(row.sourcePath),
      sha256(targetPath),
      stat(targetPath),
    ]);
    totalBytes += targetStat.size;
    if (sourceHash !== targetHash) mismatched.push(row.thumbnail);
  });

  console.log(`[target] referenced=${written.presets.length} total_available=${written.total_available} duplicate_ids=${duplicateIds.length} duplicate_names=${duplicateNames.length} missing_images=${missingTarget.length} image_count=${targetFiles.length} extra_images=${extraTarget.length} hash_mismatches=${mismatched.length}`);
  console.log(`[target] thumbnail_bytes=${totalBytes}`);

  if (
    written.presets.length !== EXPECTED_TOTAL
    || written.total_available !== EXPECTED_TOTAL
    || duplicateIds.length
    || duplicateNames.length
    || missingTarget.length
    || targetFiles.length !== EXPECTED_TOTAL
    || extraTarget.length
    || mismatched.length
  ) {
    throw new Error("Target validation failed.");
  }
}

await build();
