# Pinball flow refinement implementation plan

Goal: Keep the machine moving, make full equipment work opt-in, retain all existing devices, add meaningful upper-board L/R shots, and use the real employee model for clones.

Approved scope from owner via parent: Desktop Space or separate visible touch button accepts a brief nearby equipment offer; L/R remains flippers/mechanisms. Ordinary contact continues physics and effects. Cancel offers on expiry, distance, another contact, drain, pause or reset. Move 假 left of copier only after screenshot verification. No deployment until browser QA and new exact gate.

Tasks:
- [x] Verify published base tree 5eb7ecbc; isolate source copy.
- [x] TDD opt-in core: collision remains moving; explicit offer request; expiry/distance/reentry/disabled/repeated input.
- [ ] UI worker: Space, touch offer, focus/repeat handling, narrow viewport.
- [ ] Visual worker: same character form via pooled baked model, tint/opacity, bounded draws.
- [ ] Mechanism worker: upper L/R contact-powered paddles, preserve middle mechanisms, edge trigger and fair shot.
- [ ] Read screenshot and move 假 physical/visual point together.
- [ ] Update obsolete automatic-work tests to new intentional contract; retain safety coverage.
- [ ] Independent runtime/browser QA; exact source manifest; no push.

Risks: fast rebound offer distance, offer docking through unrelated solids, Space held through new offer, mobile button overlap, clone self-transparency and draw cost, upper assist contacts and point farming, changed game balance/rules version.
