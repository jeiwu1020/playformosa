CREATE TABLE leaderboard_best (
 scope TEXT NOT NULL CHECK(scope IN ('qa','production')), game TEXT NOT NULL, rules TEXT NOT NULL,
 device TEXT NOT NULL, nickname TEXT NOT NULL, score REAL NOT NULL CHECK(score>0), updated_at INTEGER NOT NULL,
 PRIMARY KEY(scope,game,rules,device)
);
CREATE INDEX leaderboard_rank ON leaderboard_best(scope,game,rules,score,updated_at,device);
CREATE TABLE leaderboard_submissions (
 scope TEXT NOT NULL CHECK(scope IN ('qa','production')), id TEXT NOT NULL, payload TEXT NOT NULL,
 device TEXT NOT NULL,game TEXT NOT NULL,rules TEXT NOT NULL,nickname TEXT NOT NULL,score REAL NOT NULL,
 created_at INTEGER NOT NULL,day INTEGER NOT NULL,PRIMARY KEY(scope,id)
);
CREATE INDEX leaderboard_cooldown ON leaderboard_submissions(scope,device,created_at);
CREATE INDEX leaderboard_daily ON leaderboard_submissions(scope,day);
CREATE INDEX leaderboard_expiry ON leaderboard_submissions(scope,created_at);
