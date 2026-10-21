import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const LOSSLESS_MARKERS = ["lossless", "aiff", "wav", "flac"];

const normalize = (s) =>
  String(s ?? "").normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

const groupKey = (t) => [t.name, t.artist, t.album].map(normalize).join("\u0000");

const isLossless = (t) => {
  const kind = normalize(t.kind);
  return LOSSLESS_MARKERS.some((m) => kind.includes(m));
};

const byBoolDesc = (pred) => (a, b) => Number(pred(b)) - Number(pred(a));
const byNumDesc = (get) => (a, b) => (get(b) ?? 0) - (get(a) ?? 0);
const byStrAsc = (get) => (a, b) => {
  const x = get(a);
  const y = get(b);
  if (x === y) return 0;
  if (x == null) return 1;
  if (y == null) return -1;
  return x < y ? -1 : 1;
};

// Order is the keeper policy: the first comparator that distinguishes wins.
export const KEEPER_COMPARATORS = [
  byBoolDesc((t) => t.location != null),
  byBoolDesc(isLossless),
  byNumDesc((t) => t.bitRate),
  byBoolDesc((t) => t.favorited === true),
  byNumDesc((t) => t.rating),
  byNumDesc((t) => t.playedCount),
  byStrAsc((t) => t.dateAdded),
  byStrAsc((t) => t.id),
];

const compareKeepers = (a, b) => {
  for (const cmp of KEEPER_COMPARATORS) {
    const r = cmp(a, b);
    if (r !== 0) return r;
  }
  return 0;
};

const clusterByDuration = (group, windowSec) => {
  const sorted = [...group].sort((a, b) => a.durationSec - b.durationSec);
  const clusters = [];
  let current = [];
  for (const t of sorted) {
    if (current.length > 0 && t.durationSec - current[0].durationSec > windowSec) {
      clusters.push(current);
      current = [];
    }
    current.push(t);
  }
  if (current.length > 0) clusters.push(current);
  return clusters;
};

const rowFor = (keeper, loser) => {
  const sharesFile = loser.location != null && loser.location === keeper.location;
  return {
    action: loser.location == null || sharesFile ? "unlink" : "trash",
    loserId: loser.id,
    keeperId: keeper.id,
    name: loser.name,
    artist: loser.artist,
    album: loser.album,
    loserKind: loser.kind,
    loserBitRate: loser.bitRate,
    keeperKind: keeper.kind,
    keeperBitRate: keeper.bitRate,
    loserLocation: loser.location ?? "",
    sizeBytes: loser.sizeBytes ?? 0,
  };
};

export const PLAN_COLUMNS = [
  "action", "loserId", "keeperId", "name", "artist", "album", "loserKind",
  "loserBitRate", "keeperKind", "keeperBitRate", "loserLocation", "sizeBytes",
];

export function buildPlan(tracks, opts = {}) {
  const windowSec = opts.durationWindowSec ?? 2;
  const groups = new Map();
  for (const t of tracks) {
    if (t.mediaKind !== "song") continue;
    const key = groupKey(t);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  const rows = [];
  let sets = 0;
  for (const group of groups.values()) {
    for (const cluster of clusterByDuration(group, windowSec)) {
      if (cluster.length < 2) continue;
      sets += 1;
      const [keeper, ...losers] = [...cluster].sort(compareKeepers);
      for (const loser of losers) rows.push(rowFor(keeper, loser));
    }
  }

  const trash = rows.filter((r) => r.action === "trash");
  const summary = {
    duplicateSets: sets,
    losers: { trash: trash.length, unlink: rows.length - trash.length },
    reclaimableBytes: trash.reduce((n, r) => n + r.sizeBytes, 0),
  };
  return { rows, summary };
}

const cell = (v) => String(v ?? "").replace(/[\t\r\n]+/g, " ");

export const rowsToTsv = (rows) =>
  [PLAN_COLUMNS, ...rows.map((r) => PLAN_COLUMNS.map((c) => r[c]))]
    .map((cols) => cols.map(cell).join("\t"))
    .join("\n") + "\n";

const main = () => {
  const [tracksPath, planPath] = process.argv.slice(2);
  if (!tracksPath || !planPath) {
    console.error("usage: plan.mjs TRACKS.json PLAN.tsv");
    process.exit(1);
  }
  const { rows, summary } = buildPlan(JSON.parse(readFileSync(tracksPath, "utf8")));
  writeFileSync(planPath, rowsToTsv(rows));
  console.log(`duplicate sets:      ${summary.duplicateSets}`);
  console.log(`losers (trash):      ${summary.losers.trash}`);
  console.log(`losers (unlink):     ${summary.losers.unlink}`);
  console.log(`reclaimable (trash): ${(summary.reclaimableBytes / 1048576).toFixed(1)} MiB (${summary.reclaimableBytes} bytes)`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
