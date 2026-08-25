const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data.sqlite');
const db = new Database(dbPath);

db.exec(
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nickname TEXT NOT NULL,
    realname TEXT NOT NULL,
    style TEXT NOT NULL,
    rank INTEGER UNIQUE,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenger_id TEXT NOT NULL,
    defender_id TEXT NOT NULL,
    winner_id TEXT NOT NULL,
    challenger_old_rank INTEGER,
    defender_old_rank INTEGER,
    challenger_new_rank INTEGER,
    defender_new_rank INTEGER,
    reported_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tier_messages (
    tier INTEGER PRIMARY KEY,
    message_id TEXT NOT NULL,
    channel_id TEXT NOT NULL
  );
);

module.exports = {
  getUserById: (id) => {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  getUserByRank: (rank) => {
    return db.prepare('SELECT * FROM users WHERE rank = ?').get(rank);
  },

  getAllUsers: () => {
    return db.prepare('SELECT * FROM users ORDER BY rank ASC').all();
  },

  getTotalUserCount: () => {
    const row = db.prepare('SELECT COUNT(*) as count FROM users').get();
    return row ? row.count : 0;
  },

  // 신규 유저 최하위 등록
  registerUser: (id, nickname, realname, style) => {
    const maxRankRow = db.prepare('SELECT MAX(rank) as max_rank FROM users').get();
    const nextRank = (maxRankRow && maxRankRow.max_rank !== null) ? maxRankRow.max_rank + 1 : 1;

    const stmt = db.prepare(
      INSERT INTO users (id, nickname, realname, style, rank, wins, losses)
      VALUES (?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET nickname = excluded.nickname, realname = excluded.realname, style = excluded.style
    );
    stmt.run(id, nickname, realname, style, nextRank);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  // 관리자용: 특정 티어 또는 특정 순위로 유저 삽입 등록
  registerUserWithTier: (id, nickname, realname, style, tierNum) => {
    const runTransaction = db.transaction(() => {
      // 티어별 시작 순위: 1티어=1등, 2티어=6등, 3티어=14등, 4티어=24등
      let targetRank = 1;
      if (tierNum === 2) targetRank = 6;
      else if (tierNum === 3) targetRank = 14;
      else if (tierNum === 4) targetRank = 24;

      const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      if (targetRank > total + 1) {
        targetRank = total + 1;
      }

      // targetRank 이상의 모든 사람들을 1칸씩 뒤로(+1) 밀어냄
      db.prepare('UPDATE users SET rank = rank + 1 WHERE rank >= ?').run(targetRank);

      const stmt = db.prepare(
        INSERT INTO users (id, nickname, realname, style, rank, wins, losses)
        VALUES (?, ?, ?, ?, ?, 0, 0)
      );
      stmt.run(id, nickname, realname, style, targetRank);

      return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    });

    return runTransaction();
  },

  updateUserInfo: (id, nickname, realname, style) => {
    const stmt = db.prepare(
      UPDATE users 
      SET nickname = COALESCE(?, nickname),
          realname = COALESCE(?, realname),
          style = COALESCE(?, style)
      WHERE id = ?
    );
    stmt.run(nickname, realname, style, id);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  applyLadderWin: (challengerId, defenderId) => {
    const runTransaction = db.transaction(() => {
      const challenger = db.prepare('SELECT * FROM users WHERE id = ?').get(challengerId);
      const defender = db.prepare('SELECT * FROM users WHERE id = ?').get(defenderId);

      if (!challenger || !defender) {
        throw new Error('유저를 찾을 수 없습니다.');
      }

      const cRank = challenger.rank;
      const dRank = defender.rank;

      if (cRank <= dRank) {
        db.prepare('UPDATE users SET wins = wins + 1 WHERE id = ?').run(challengerId);
        db.prepare('UPDATE users SET losses = losses + 1 WHERE id = ?').run(defenderId);
        return {
          challengerOldRank: cRank,
          defenderOldRank: dRank,
          challengerNewRank: cRank,
          defenderNewRank: dRank,
          rankChanged: false
        };
      }

      db.prepare('UPDATE users SET rank = -1 WHERE id = ?').run(challengerId);

      db.prepare(
        UPDATE users 
        SET rank = rank + 1 
        WHERE rank >= ? AND rank < ?
      ).run(dRank, cRank);

      db.prepare('UPDATE users SET rank = ?, wins = wins + 1 WHERE id = ?').run(dRank, challengerId);
      db.prepare('UPDATE users SET losses = losses + 1 WHERE id = ?').run(defenderId);

      db.prepare(
        INSERT INTO matches (challenger_id, defender_id, winner_id, challenger_old_rank, defender_old_rank, challenger_new_rank, defender_new_rank, reported_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ).run(challengerId, defenderId, challengerId, cRank, dRank, dRank, dRank + 1, challengerId);

      return {
        challengerOldRank: cRank,
        defenderOldRank: dRank,
        challengerNewRank: dRank,
        defenderNewRank: dRank + 1,
        rankChanged: true
      };
    });

    return runTransaction();
  },

  applyLadderLoss: (challengerId, defenderId, reportedBy) => {
    const runTransaction = db.transaction(() => {
      const challenger = db.prepare('SELECT * FROM users WHERE id = ?').get(challengerId);
      const defender = db.prepare('SELECT * FROM users WHERE id = ?').get(defenderId);

      if (!challenger || !defender) throw new Error('유저를 찾을 수 없습니다.');

      db.prepare('UPDATE users SET losses = losses + 1 WHERE id = ?').run(challengerId);
      db.prepare('UPDATE users SET wins = wins + 1 WHERE id = ?').run(defenderId);

      db.prepare(
        INSERT INTO matches (challenger_id, defender_id, winner_id, challenger_old_rank, defender_old_rank, challenger_new_rank, defender_new_rank, reported_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ).run(challengerId, defenderId, defenderId, challenger.rank, defender.rank, challenger.rank, defender.rank, reportedBy);

      return {
        challengerRank: challenger.rank,
        defenderRank: defender.rank,
        rankChanged: false
      };
    });

    return runTransaction();
  },

  forceSetRank: (userId, targetRank) => {
    const runTransaction = db.transaction(() => {
      const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!targetUser) throw new Error('유저를 찾을 수 없습니다.');

      const oldRank = targetUser.rank;
      const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

      if (targetRank < 1 || targetRank > total) {
        throw new Error('순위는 1부터 ' + total + ' 사이여야 합니다.');
      }

      if (oldRank === targetRank) return;

      db.prepare('UPDATE users SET rank = -1 WHERE id = ?').run(userId);

      if (oldRank > targetRank) {
        db.prepare('UPDATE users SET rank = rank + 1 WHERE rank >= ? AND rank < ?').run(targetRank, oldRank);
      } else {
        db.prepare('UPDATE users SET rank = rank - 1 WHERE rank > ? AND rank <= ?').run(oldRank, targetRank);
      }

      db.prepare('UPDATE users SET rank = ? WHERE id = ?').run(targetRank, userId);
    });

    return runTransaction();
  },

  removeUser: (userId) => {
    const runTransaction = db.transaction(() => {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) throw new Error('등록되지 않은 유저입니다.');

      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      db.prepare('UPDATE users SET rank = rank - 1 WHERE rank > ?').run(user.rank);
      return user;
    });

    return runTransaction();
  },

  getTierMessage: (tier) => {
    return db.prepare('SELECT * FROM tier_messages WHERE tier = ?').get(tier);
  },

  saveTierMessage: (tier, messageId, channelId) => {
    db.prepare(
      INSERT INTO tier_messages (tier, message_id, channel_id)
      VALUES (?, ?, ?)
      ON CONFLICT(tier) DO UPDATE SET message_id = excluded.message_id, channel_id = excluded.channel_id
    ).run(tier, messageId, channelId);
  }
};
