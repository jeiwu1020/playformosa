# Superseded v8 itinerary

Published source: d674b77d9fcbe28798bbb70e88d69c60bfe5a8ff. The old route repeated Taiwan0–36,Pacific36–72,Japan72–210,Egypt210–360,France360–510,USA510–720 game metres. v9 replaces that route and display scale, not its four-key physics.

`v8-world.test.mjs` first test now tests the outward expanded route. Two scenery tests retain real-geometry and nearest-visible-landmark assertions but use the new milestone locations and shared silhouette names. `v8-motion.test.mjs` keeps all physical assertions: only the storage namespace expectation changes to v9, the old72m Japan boundary is now Taoyuan, and the long-flight test name no longer claims720m world loops. v8 best/journey/verdict keys remain untouched.
