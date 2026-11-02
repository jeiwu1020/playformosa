CREATE TABLE play_count_totals (
 scope TEXT NOT NULL CHECK(scope IN ('qa','production')),
 counter_key TEXT NOT NULL, total INTEGER NOT NULL CHECK(total>=0), since INTEGER NOT NULL,
 day INTEGER NOT NULL, day_total INTEGER NOT NULL CHECK(day_total>=0),
 PRIMARY KEY(scope,counter_key)
);
CREATE TABLE play_count_receipts (
 scope TEXT NOT NULL CHECK(scope IN ('qa','production')), id TEXT NOT NULL,
 payload TEXT NOT NULL, device TEXT NOT NULL, counter_key TEXT NOT NULL,
 created_at INTEGER NOT NULL, day INTEGER NOT NULL,
 PRIMARY KEY(scope,id)
);
CREATE INDEX play_count_device ON play_count_receipts(scope,device,created_at);
CREATE INDEX play_count_daily ON play_count_receipts(scope,day,device);
CREATE INDEX play_count_expiry ON play_count_receipts(scope,created_at);
