# Courtesy contest QA contract

Only scope `qa` resolves `courtesy-contest`; production requests fail closed.
Public payload uses rules `press-courtesy-v2`, unit `courtesies`, status `seated`,
`score` for completed courtesy count, and `secondaryScore` for seconds remaining
when a valid thanks press is accepted before the deadline (.01 through 30 inclusive, in whole hundredths). Offers keep the same standing gesture at every count and never create a safe seat.
Only a completed safely seated round with an accepted thanks press
may be offered for upload. Bonus/grade never changes the count. The integration
rounds seconds upward to the displayed hundredth before submitting. Client and server
reject zero and sub-hundredth scores; their hundredth check tolerates binary floating-point noise
within 1e-9 hundredths. The new rules key isolates old seated-time rows without deleting them.

Order: count descending, then remaining seconds ascending. Equal tuples share a
competition rank. Manual uploads reuse the shared anonymous-device, nickname,
consent notice, cooldown, frozen retry receipt and cancellation controls.

## Important storage compatibility

The existing `0001.sql` best-score table has `CHECK(score>0)`. Successful zero-count
rounds are legitimate. Therefore **this board only** stores `score = count + 1`
in both best and receipt rows. Every public entry/own/best read subtracts one.
Sorting and best-update comparisons run on consistently encoded SQL values;
gaps are differences so the offset cancels. Payload hashes remain based on the
canonical public payload, not its storage representation. Maximum public count
is `Number.MAX_SAFE_INTEGER - 1`, keeping the encoded value a safe integer.
Existing games store and return exactly their original values.

`secondary_score` from the existing `003.sql` migration is reused unchanged.
No database migration, index change, or live database action is needed/performed.
The existing secondary index sorts DESC/DESC, so mixed-direction courtesy reads
may require a temporary sort; the existing 10,000-row scope cap still applies.
Future SQL diagnostics must subtract one for this board only. Do not silently
change the encoding under this rules version.
