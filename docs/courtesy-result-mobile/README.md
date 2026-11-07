# Courtesy result, mobile layout, and immediate acceptance boundary

This follow-up is based exclusively on preview/hurdles commit f702303ff984ec84dc90fc74a27dba7a696bcd04, complete Git tree fe3ff7d197035a922c993e29837f48e495dc385f. It does not change main.

The follow-up covers result/mobile presentation and immediate acceptance of a valid 謝謝 press before the deadline. Passengers remain in a fixed standing pose throughout repeated mutual offers; offers no longer advance a cumulative approach toward the seat, and there is no automatic seating success. Only a valid 謝謝 press succeeds. Acceptance locks the successful result and timestamp while the seating animation continues. The press-courtesy-v2 leaderboard rule separates these results from the earlier rule, with remaining-time scoring validated at hundredth-second precision. Exact source, test, and documentation scope is recorded in the sealed manifest rather than admitted by directory-wide exemptions.

BASELINE.json pins all 1,538 parent blobs and modes. MANIFEST.json records exact changed paths, UTF-8 preimages, current SHA-256 and Git blob identities, and the exact additions. The helper reconstructs the complete parent Git tree and rejects modified preimages, unexpected scope, missing additions, duplicate inventory entries, and current-byte drift. Unknown inventory paths remain visible to older audits rather than being silently discarded.

Historical manifests and baselines remain unchanged. The prior upgrade helper delegates through this new outer boundary before evaluating its original identities. Its original bytes are themselves a verified preimage, so the chain remains reversible.

One unavailable historical binary, docs/fast-hands/baselines/screen-alpha/assets/duel-items-atlas.png, remains pinned as remote blob 5491d5280c2a2faeac41e9a19028698e9af015f8. Publishing must use the existing remote tree as its base, preserving that blob without deletion or a substitute. No missing asset is manufactured by this change.

To regenerate, run regenerate.py with --parent pointing to a byte-verified checkout of the pinned commit and --tree pointing to its complete recursive Git tree JSON. Supply each permitted changed source as --allow-changed and each additional new test as --allow-added. The script refuses unlisted source changes or additions. Generated build output, dependencies, local evidence, and tool state are excluded from source publication.
