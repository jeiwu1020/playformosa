# Candidate application contract — not publication authorization

The source is a locally runnable game candidate, not a mirror-delete deployment bundle. Serve `public/` over HTTP and open `/games/long-jump/` to run the game. The original root homepage image is included unchanged and was verified against the remote Git blob.

- Target base: `jeiwu1020/playformosa` commit `68685a8282a2143ff72832de03e4f6d06cf1adc9`.
- Only apply `evidence/changed-files.json` and the corresponding current files (or the canonical-base `evidence/focused-v8.patch`). Do not use absence of a local file as an instruction to delete it.
- Preserve unchanged `public/assets/hero-long-jump.png` as exact Git blob `89d8dd2580a7b4c0842b6c7091bae7a8fa8fcc1f`, 2,290,523 bytes. It was recovered from the verified public deployment after GitHub binary readers failed; it is not a changed asset.
- The focused patch normalizes the retrieved base text to its verified upstream Git blobs before diffing. The restored text snapshot's extra trailing newline is not a platform change.
- No main push, merge, deployment or change to other platform games is authorized by this package. Recheck remote HEAD before applying to avoid overwriting later work.
- Review evidence lives under `evidence/`; actual CPU images are not live-browser screenshots. Source code contains no remote rendering trick, gameplay video replacement or injected successful game state.
