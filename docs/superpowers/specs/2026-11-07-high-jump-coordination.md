# High-jump hand and leg coordination

## Approved intent
Make the hands lead the head, shoulders and back over the bar, then let the legs complete clearance after the hips. Near a difficult clearance, good coordination should visibly help. Preserve forgiving beginner clears without a hidden requirement to press a hand button, and never add airborne lift. The user approved making this change and pushing the existing preview/hurdles branch; main is excluded.

## Approach
Keep the existing four-button, pose-based physics. Improve the body articulation and reference clearance plan together, using the same anatomical points for drawing and collision. A timed button checklist is rejected because an athlete visibly above the bar should not fail. A cosmetic-only improvement is insufficient because the user's concern is meaningful control.

## Constraints
No changes to other games, leaderboard contracts, accounts, fees or main. Preserve the existing ballistic center-of-mass path after takeoff. Plan the bar once from a coordinated reference at takeoff, not from live player mistakes. Keep early, late, no-hand, no-leg, one-hand and all-held behavior finite and understandable. Preserve pause/cancellation, independent keyboard and touch owners, and replay snapshots.

## Builder decisions and acceptance
Use continuous articulated geometry, not a secret timing grade. Select forgiving transition ranges by deterministic input traces and retain successful low-pressure no-hand cases. Publish only the reviewed delta on the latest remote parent; preserve unrelated and locally unavailable remote assets. Validate physics, actual character endpoints, input ownership, mobile layout and keyboard flows, and disclose hardware/device limitations.
