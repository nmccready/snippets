import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPlan, rowsToTsv } from "./plan.mjs";

let seq = 0;
const track = (over = {}) => {
  seq += 1;
  return {
    id: `ID${String(seq).padStart(4, "0")}`,
    name: "Song A",
    artist: "Artist X",
    album: "Album Y",
    durationSec: 200,
    bitRate: 256,
    kind: "AAC audio file",
    sizeBytes: 1000,
    location: `/music/file${seq}.m4a`,
    dateAdded: "2020-01-01T00:00:00.000Z",
    playedCount: 0,
    rating: 0,
    favorited: false,
    mediaKind: "song",
    ...over,
  };
};

const onlyRow = (tracks) => {
  const { rows } = buildPlan(tracks);
  assert.equal(rows.length, 1);
  return rows[0];
};

test("groups case, whitespace and Unicode normalization insensitively", () => {
  const a = track({ name: "Café  Song" });
  const b = track({ name: " café song ", artist: "ARTIST x", album: "album   y" });
  const { summary } = buildPlan([a, b]);
  assert.equal(summary.duplicateSets, 1);
});

test("different album is not a duplicate", () => {
  const { rows } = buildPlan([track(), track({ album: "Album Z" })]);
  assert.equal(rows.length, 0);
});

test("duration window is inclusive at 2.0s and exclusive at 2.5s", () => {
  assert.equal(buildPlan([track(), track({ durationSec: 202 })]).rows.length, 1);
  assert.equal(buildPlan([track(), track({ durationSec: 202.5 })]).rows.length, 0);
});

test("window is anchored to the cluster's first member", () => {
  const { rows, summary } = buildPlan([
    track({ durationSec: 200 }),
    track({ durationSec: 201.5 }),
    track({ durationSec: 203 }),
  ]);
  assert.equal(summary.duplicateSets, 1);
  assert.equal(rows.length, 1);
});

test("lossless keeper beats higher-bitrate lossy", () => {
  const lossy = track({ bitRate: 320 });
  const lossless = track({ bitRate: 900, kind: "Apple Lossless audio file" });
  const row = onlyRow([lossy, lossless]);
  assert.equal(row.keeperId, lossless.id);
  assert.equal(row.loserId, lossy.id);
});

test("existing file beats missing file even if the missing one is lossless", () => {
  const present = track();
  const missing = track({ location: null, kind: "Apple Lossless audio file" });
  const row = onlyRow([missing, present]);
  assert.equal(row.keeperId, present.id);
  assert.equal(row.action, "unlink");
});

test("higher bitrate wins among lossy", () => {
  const lo = track({ bitRate: 128 });
  const hi = track({ bitRate: 256 });
  assert.equal(onlyRow([lo, hi]).keeperId, hi.id);
});

test("favorited breaks a bitrate tie", () => {
  const plain = track();
  const fav = track({ favorited: true });
  assert.equal(onlyRow([plain, fav]).keeperId, fav.id);
});

test("earlier dateAdded breaks an otherwise complete tie", () => {
  const newer = track({ dateAdded: "2022-01-01T00:00:00.000Z" });
  const older = track({ dateAdded: "2019-01-01T00:00:00.000Z" });
  assert.equal(onlyRow([newer, older]).keeperId, older.id);
});

test("lower id is the final deterministic tiebreak", () => {
  const a = track({ id: "AAAA" });
  const b = track({ id: "BBBB" });
  assert.equal(onlyRow([b, a]).keeperId, "AAAA");
});

test("two entries pointing at one file become unlink", () => {
  const a = track({ location: "/music/shared.m4a" });
  const b = track({ location: "/music/shared.m4a" });
  assert.equal(onlyRow([a, b]).action, "unlink");
});

test("distinct files become trash and count toward reclaimable bytes", () => {
  const { rows, summary } = buildPlan([track({ bitRate: 320 }), track({ sizeBytes: 4096 })]);
  assert.equal(rows[0].action, "trash");
  assert.deepEqual(summary, {
    duplicateSets: 1,
    losers: { trash: 1, unlink: 0 },
    reclaimableBytes: 4096,
  });
});

test("loser with no location is unlink and reclaims nothing", () => {
  const { rows, summary } = buildPlan([track(), track({ location: null, sizeBytes: 5000 })]);
  assert.equal(rows[0].action, "unlink");
  assert.equal(rows[0].loserLocation, "");
  assert.equal(summary.reclaimableBytes, 0);
});

test("non-song media kinds are excluded", () => {
  const { rows } = buildPlan([track({ mediaKind: "music-video" }), track({ mediaKind: "music-video" })]);
  assert.equal(rows.length, 0);
  assert.equal(buildPlan([track(), track({ mediaKind: "pdf" })]).rows.length, 0);
});

test("tsv has a header and strips tabs and newlines from fields", () => {
  const { rows } = buildPlan([track({ bitRate: 320 }), track({ name: "Song\tA\n" })]);
  const lines = rowsToTsv(rows).trimEnd().split("\n");
  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith("action\tloserId\tkeeperId"));
  assert.equal(lines[1].split("\t").length, 12);
});

test("copy inside the Music media folder beats a higher-quality copy elsewhere", () => {
  const inLibrary = track({ location: "/x/Media.localized/Music/a.mp3", bitRate: 256 });
  const outside = track({ location: "/scratch/a.mp3", bitRate: 320, dateAdded: "2019-01-01T00:00:00.000Z" });
  const row = onlyRow([outside, inLibrary]);
  assert.equal(row.keeperId, inLibrary.id);
  assert.equal(row.loserId, outside.id);
});

test("two losers sharing one file trash it once", () => {
  const keeper = track({ bitRate: 320 });
  const a = track({ location: "/music/dup.m4a" });
  const b = track({ location: "/music/dup.m4a" });
  const actions = buildPlan([keeper, a, b]).rows.map((r) => r.action).sort();
  assert.deepEqual(actions, ["trash", "unlink"]);
});

test("a file still used by a surviving track outside the set is never trashed", () => {
  const keeper = track({ bitRate: 320 });
  const loser = track({ location: "/music/shared.m4a" });
  const unrelated = track({ name: "Other Song", location: "/music/shared.m4a" });
  const row = onlyRow([keeper, loser, unrelated]);
  assert.equal(row.action, "unlink");
});
