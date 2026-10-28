# Visual long-jump sandpits

Approved user direction: a small normal sandpit after the takeoff board; skilled players may fly beyond it through the existing cities/world/space. Near a distant landing, a second pit comically slides in to receive the athlete. This is visual only: do not change rules, position, velocity, pose, score, distance, collision, classification, controls, layout, audio, or the 3D character.

Implementation choice: use existing Three.js geometry/materials, not new image assets. Keep one fixed pit plus one reusable sliding pit and a bounded pool of impact marks/particles. Distinguish feet, seat, head, and other contacts using the existing first landing classification. Head landings retain the true character/legs rather than fabricating a new body pose. Ground impressions and sand spray must be present in the result snapshot.

Alternative approaches were an infinite sand strip (rejected: obscures world scenery) and moving the athlete into a pit (rejected: changes physics). The approved approach moves only the scenery to the athlete. No new controls or rules.
