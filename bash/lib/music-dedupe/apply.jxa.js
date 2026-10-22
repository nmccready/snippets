// argv: PLAN.tsv MODE (apply|dry). Prints one "STATUS<TAB>loserId<TAB>message" line per row.
ObjC.import("Foundation");

const TRASH_BATCH = 50;

function readPlan(path) {
  const text = $.NSString.stringWithContentsOfFileEncodingError($(path), $.NSUTF8StringEncoding, null);
  if (!text) throw new Error("cannot read plan: " + path);
  return ObjC.unwrap(text)
    .split("\n")
    .slice(1)
    .filter((l) => l.trim() !== "")
    .map((l) => l.split("\t"))
    .map(([action, loserId, keeperId, name, artist, album, , , , , loserLocation]) => (
      { action, loserId, keeperId, label: [name, artist, album].join(" / "), loserLocation }
    ));
}

function run(argv) {
  const [planPath, mode] = argv;
  const dry = mode === "dry";
  const Music = Application("Music");
  const Finder = Application("Finder");
  Finder.includeStandardAdditions = false;
  const fileTracks = Music.libraryPlaylists[0].fileTracks;
  const out = [];
  const emit = (status, id, msg) => out.push([status, id, msg].join("\t"));

  const find = (id) => {
    try {
      const t = fileTracks.whose({ persistentID: id })[0];
      t.persistentID();
      return t;
    } catch (e) {
      return null;
    }
  };
  const locationOf = (t) => {
    const v = t.location();
    return v === null || v === undefined ? null : v.toString();
  };

  let pending = [];
  const flush = () => {
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];
    try {
      Finder.delete(batch.map((p) => Path(p)));
      batch.forEach((p) => emit("TRASHED", "-", p));
    } catch (e) {
      batch.forEach((p) => {
        try {
          Finder.delete(Path(p));
          emit("TRASHED", "-", p);
        } catch (e2) {
          emit("ERROR", "-", "finder trash failed: " + p + " " + e2);
        }
      });
    }
  };

  for (const row of readPlan(planPath)) {
    const { action, loserId, keeperId, label, loserLocation } = row;
    if (action !== "trash" && action !== "unlink") {
      emit("SKIP", loserId, "unknown action '" + action + "'");
      continue;
    }
    if (!loserId || !keeperId || loserId === keeperId) {
      emit("SKIP", loserId, "bad ids");
      continue;
    }
    const loser = find(loserId);
    if (!loser) {
      emit("SKIP", loserId, "loser already gone");
      continue;
    }
    const keeper = find(keeperId);
    if (!keeper) {
      emit("SKIP", loserId, "keeper " + keeperId + " missing, refusing to delete");
      continue;
    }

    const loserLoc = locationOf(loser);
    const keeperLoc = locationOf(keeper);
    let effective = action;
    if (action === "trash") {
      if (loserLoc !== loserLocation) {
        emit("SKIP", loserId, "location changed since plan: " + loserLoc);
        continue;
      }
      if (loserLoc === keeperLoc) effective = "unlink";
    }

    if (dry) {
      emit("WOULD_" + effective.toUpperCase(), loserId, label + (effective === "trash" ? " " + loserLoc : ""));
      continue;
    }

    try {
      const played = keeper.playedCount() + loser.playedCount();
      if (played !== keeper.playedCount()) keeper.playedCount = played;
      const rating = Math.max(keeper.rating(), loser.rating());
      if (rating !== keeper.rating()) keeper.rating = rating;
      if (loser.favorited() && !keeper.favorited()) keeper.favorited = true;
      Music.delete(loser);
    } catch (e) {
      emit("ERROR", loserId, "library delete failed: " + e);
      continue;
    }
    emit("UNLINKED", loserId, label);
    if (effective === "trash") {
      pending.push(loserLoc);
      if (pending.length >= TRASH_BATCH) flush();
    }
  }
  flush();
  return out.join("\n");
}
