// Read-only. One Apple Event per property over the whole collection; per-track
// loops are orders of magnitude slower on large libraries.
function run() {
  const Music = Application("Music");
  const ft = Music.libraryPlaylists[0].fileTracks;
  const props = {
    id: ft.persistentID(),
    name: ft.name(),
    artist: ft.artist(),
    album: ft.album(),
    durationSec: ft.duration(),
    bitRate: ft.bitRate(),
    kind: ft.kind(),
    sizeBytes: ft.size(),
    location: ft.location(),
    dateAdded: ft.dateAdded(),
    playedCount: ft.playedCount(),
    rating: ft.rating(),
    favorited: ft.favorited(),
    mediaKind: ft.mediaKind(),
  };
  const toPath = (v) => (v === null || v === undefined ? null : v.toString());
  const toIso = (v) => (v instanceof Date ? v.toISOString() : null);
  const tracks = props.id.map((id, i) => ({
    id,
    name: props.name[i],
    artist: props.artist[i],
    album: props.album[i],
    durationSec: props.durationSec[i],
    bitRate: props.bitRate[i],
    kind: props.kind[i],
    sizeBytes: props.sizeBytes[i],
    location: toPath(props.location[i]),
    dateAdded: toIso(props.dateAdded[i]),
    playedCount: props.playedCount[i],
    rating: props.rating[i],
    favorited: props.favorited[i],
    mediaKind: props.mediaKind[i],
  }));
  return JSON.stringify(tracks);
}
