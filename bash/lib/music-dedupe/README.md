# music-dedupe

Find and remove duplicate songs in the macOS Music app (formerly iTunes), with a plan you review before anything is deleted.

```bash
music-dedupe scan                              # read-only; writes plan.tsv
music-dedupe apply <plan.tsv> --dry-run        # show what would happen
music-dedupe apply <plan.tsv>                  # do it (asks you to type "yes")
```

## Why this exists

A Music library that has lived through years of iTunes imports, re-rips, iCloud Music Library, and Sync Library collects duplicates of three kinds:

- **Two files for one song.** For example, a 128 kbps MP3 and a 256 kbps re-rip, or a copy imported from `~/Downloads` and a copy in the media folder.
- **Two library entries for one file.** The same file is added twice, often after a library rebuild or a cloud sync.
- **Entries with no file.** The file was deleted or moved outside the Music app, so the entry shows a `!`.

The Music app can show duplicates (**File > Library > Show Duplicate Items**), but you must decide on and delete each one by hand. It does not keep the best copy, and it does not keep your play counts or ratings. For a library of thousands of songs, that work is slow and easy to get wrong.

`music-dedupe` makes those decisions with fixed rules, writes them to a file that you can read and edit, and then applies only that file.

## Requirements

- macOS with the built-in Music app. The tool controls the Music app through JavaScript for Automation (`osascript -l JavaScript`).
- Node.js 18 or later, for the planner.
- Automation permission for your terminal to control **Music** and **Finder**. macOS asks for this the first time you run the tool. You can change it later in System Settings > Privacy & Security > Automation. The first permission prompt can make a command look stuck until you answer it.

The tool works only on local file tracks. It ignores Apple Music catalog songs that are streamed or downloaded through a subscription, because those are not files that you own.

## How it decides

### What counts as a duplicate

Two songs are duplicates when both of these are true:

- They have the same **name, artist, and album**. Case, extra whitespace, and Unicode form are ignored.
- Their lengths are **within 2 seconds** of each other.

Only items whose media kind is `song` are compared. PDF booklets and music videos are skipped.

Matching uses tags only. It does not compare audio. A live version and a studio version with identical tags and a similar length are treated as duplicates, so review the plan.

### Which copy is kept

In each duplicate set, the copy kept is the first one that wins on this list, checked in order:

1. Its file exists on disk.
2. Its file is inside the Music media folder (`…/Media.localized/`).
3. It is lossless (Apple Lossless, AIFF, WAV, or FLAC).
4. It has a higher bit rate.
5. It is marked as a favorite.
6. It has a higher star rating.
7. It has a higher play count.
8. It was added to the library earlier.
9. It has the lower persistent ID. This is only a tie-break, so the result is always the same.

Rule 2 prevents a stray copy (in `~/Downloads`, on an external drive, or in a scratch folder) from replacing the library's own file.

### What happens to the other copies

Each copy that is not kept becomes one row in `plan.tsv`, with one of two actions:

| Action | Library entry | File |
|---|---|---|
| `trash` | Removed | Moved to the Trash |
| `unlink` | Removed | Kept. The row is `unlink` when the entry has no file, or when a track that stays in the library still uses that file. |

Before the tool removes a copy, it moves that copy's play count, star rating, and favorite to the copy it keeps. Play counts are added together, the higher rating is kept, and the song stays a favorite if either copy was.

## Workflow

1. **Back up first.** Make a copy of your media folder and of the `Music Library.musiclibrary` file, or make sure Time Machine is current.
2. **Scan.**
   ```bash
   music-dedupe scan
   ```
   The scan is read-only. It writes `tracks.json` and `plan.tsv` to `~/.cache/music-dedupe/<timestamp>/` and prints a summary like this:
   ```
   duplicate sets:      574
   losers (trash):      192
   losers (unlink):     385
   reclaimable (trash): 1458.7 MiB
   ```
   A scan of about 11,500 songs takes about 12 seconds.
3. **Review `plan.tsv`.** Open it in Numbers, Excel, or a text editor. Delete any row that you want to skip. `apply` accepts any subset of the rows.
4. **Dry run.**
   ```bash
   music-dedupe apply ~/.cache/music-dedupe/<timestamp>/plan.tsv --dry-run
   ```
5. **Apply.**
   ```bash
   music-dedupe apply ~/.cache/music-dedupe/<timestamp>/plan.tsv
   ```
   Type `yes` when the tool asks. Every action is written to `apply-<timestamp>.log` next to the plan.

Do not add, delete, or edit songs in the Music app between the scan and the apply. If you change the library, scan again.

### plan.tsv columns

| Column | Meaning |
|---|---|
| `action` | `trash` or `unlink` |
| `loserId` | Persistent ID of the copy to remove |
| `keeperId` | Persistent ID of the copy to keep |
| `name`, `artist`, `album` | Tags of the copy to remove |
| `loserKind`, `loserBitRate` | File type and bit rate of the copy to remove |
| `keeperKind`, `keeperBitRate` | File type and bit rate of the copy to keep |
| `loserLocation` | Path of the file to remove (empty when there is no file) |
| `sizeBytes` | Disk space freed by a `trash` row |

## Safety

- **Files are never deleted directly.** They are moved to the Trash through Finder, so you can use **Put Back** to restore them until you empty the Trash. If your media folder is in iCloud Drive, a file that you remove there can also be recovered for 30 days from iCloud.com > **Data Recovery**.
- **Both copies are never removed.** Before each row, `apply` looks up both tracks again. If the copy to keep is missing, the row is refused.
- **You can run a plan again.** Rows whose copy to remove is already gone are skipped.
- **Changed rows are skipped.** If a file moved after the scan, its `trash` row is skipped. If the file is now shared with the copy to keep, the row is changed to `unlink`.

### Known limits

- `apply` removes library entries first and moves files to the Trash in batches of 50. If the process is stopped between those steps, some files remain on disk with no library entry. Their paths are in `plan.tsv` (`loserLocation`). To bring them back into the library, use **File > Add to Library**.
- Matching uses tags only. Songs with wrong or missing tags are not found. To find duplicates by audio fingerprint, use a tool such as [beets](https://beets.io).
- If Sync Library is on, removing a library entry also removes it from your other devices.

## Files

| Path | Role |
|---|---|
| `bash/music-dedupe` | CLI entry point. On your `PATH` through the `bash/` directory. |
| `bash/lib/music-dedupe/export.jxa.js` | Reads all file tracks from the Music app in bulk, then prints JSON. |
| `bash/lib/music-dedupe/plan.mjs` | Pure planner (`buildPlan`) and its CLI. Turns `tracks.json` into `plan.tsv`. |
| `bash/lib/music-dedupe/apply.jxa.js` | Applies the plan rows through the Music app and Finder. |
| `bash/lib/music-dedupe/plan.test.mjs` | Planner tests with synthetic tracks. |

## Development

```bash
node --test 'bash/lib/music-dedupe/*.test.mjs'
shellcheck bash/music-dedupe
```

The planner has no I/O, so it can be tested without the Music app. Test fixtures use made-up songs. Do not commit real library data, because this repository is public. Scan output goes to `~/.cache/music-dedupe/` or to a `tmp/` directory that Git ignores.
