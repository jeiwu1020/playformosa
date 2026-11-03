-- Production Rod promotion: additive, no score deletion or rewrite.
-- Verify column absence with PRAGMA table_info and export a backup before running once.
-- If either column already exists, execute only its missing statement after inspection.
ALTER TABLE leaderboard_best ADD COLUMN secondary_score REAL NOT NULL DEFAULT 0 CHECK(secondary_score>=0);
ALTER TABLE leaderboard_submissions ADD COLUMN secondary_score REAL NOT NULL DEFAULT 0 CHECK(secondary_score>=0);
CREATE INDEX IF NOT EXISTS leaderboard_reaction_rod_rank ON leaderboard_best(scope,game,rules,score DESC,secondary_score DESC,device) WHERE game='reaction-rod';
-- Code rollback leaves these compatible defaulted columns in place. Never drop data to roll back.
