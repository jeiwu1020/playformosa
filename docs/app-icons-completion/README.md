# Installation icon completion

This change adds independent shortcut/install identities to existing local game entries only. Every game HTML change is one exact tagged block immediately before `</head>`; gameplay, body, saves, audio, menus and existing images are unchanged. No service worker or install prompt is added. Fast Hands entries use separate manifest IDs and start URLs.

BASELINE.json pins the full parent Git inventory and tree. MANIFEST.json records exact before/after bytes and hashes, added files and production inventory additions. The newest historical reader reverses only this patch; old ledgers and hashes remain untouched. Live behavior tests use live source.

New artwork was visually inspected at 180, 48 and 32 pixels and under a central 40%-radius circle. Automated tests decode all images, check opacity, dimensions and distinct identities. Original sprint and javelin menu images are preserved; their new Apple icons use a v2 filename.

Physical-device installation, OS launcher appearance and existing browser/OS icon-cache refresh have not been tested. No claim is made that existing installed shortcuts refresh automatically.
