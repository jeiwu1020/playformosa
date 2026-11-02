-- Run once on playformosa-leaderboard-qa only. Existing scores are preserved.
ALTER TABLE leaderboard_best ADD COLUMN secondary_score REAL NOT NULL DEFAULT 0 CHECK(secondary_score>=0);
ALTER TABLE leaderboard_submissions ADD COLUMN secondary_score REAL NOT NULL DEFAULT 0 CHECK(secondary_score>=0);
CREATE INDEX leaderboard_rank_secondary ON leaderboard_best(scope,game,rules,score DESC,secondary_score DESC,device);
