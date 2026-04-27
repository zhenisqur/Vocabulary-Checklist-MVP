import db, { Word } from "../config/db";

export const wordRepository = {
  findAllActive(userId: number): Promise<Word[]> {
    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM words WHERE (status = 'active' OR status IS NULL) AND user_id = ?";
      db.all(sql, [userId], (err: Error | null, rows: Word[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  findBuried(userId: number): Promise<Word[]> {
    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM words WHERE status = 'buried' AND user_id = ? ORDER BY id DESC";
      db.all(sql, [userId], (err: Error | null, rows: Word[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  getRandomActive(userId: number): Promise<Word | null> {
    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM words WHERE (status = 'active' OR status IS NULL) AND user_id = ? ORDER BY RANDOM() LIMIT 1";
      db.get(sql, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row as Word || null);
      });
    });
  },

  getRandomBuried(userId: number): Promise<Word | null> {
    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM words WHERE status = 'buried' AND user_id = ? ORDER BY RANDOM() LIMIT 1";
      db.get(sql, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row as Word || null);
      });
    });
  },

  buryWord(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE words SET status = 'buried', death_count = death_count + 1 WHERE id = ?",
        [id],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  },

  getRandomActiveExclude(userId: number, excludeIds: number[]): Promise<Word | null> {
    return new Promise((resolve, reject) => {
      if (excludeIds.length === 0) {
        const sql = "SELECT * FROM words WHERE (status = 'active' OR status IS NULL) AND user_id = ? ORDER BY RANDOM() LIMIT 1";
        db.get(sql, [userId], (err, row) => {
          if (err) reject(err);
          else resolve(row as Word || null);
        });
      } else {
        const placeholders = excludeIds.map(() => '?').join(',');
        const sql = `SELECT * FROM words WHERE (status = 'active' OR status IS NULL) AND user_id = ? AND id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`;
        db.get(sql, [userId, ...excludeIds], (err, row) => {
          if (err) reject(err);
          else resolve(row as Word || null);
        });
      }
    });
  },

  getRandomBuriedExclude(userId: number, excludeIds: number[]): Promise<Word | null> {
    return new Promise((resolve, reject) => {
      if (excludeIds.length === 0) {
        const sql = "SELECT * FROM words WHERE status = 'buried' AND user_id = ? ORDER BY RANDOM() LIMIT 1";
        db.get(sql, [userId], (err, row) => {
          if (err) reject(err);
          else resolve(row as Word || null);
        });
      } else {
        const placeholders = excludeIds.map(() => '?').join(',');
        const sql = `SELECT * FROM words WHERE status = 'buried' AND user_id = ? AND id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`;
        db.get(sql, [userId, ...excludeIds], (err, row) => {
          if (err) reject(err);
          else resolve(row as Word || null);
        });
      }
    });
  },

  countActive(userId: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = "SELECT COUNT(*) as count FROM words WHERE (status = 'active' OR status IS NULL) AND user_id = ?";
      db.get(sql, [userId], (err, row: any) => {
        if (err) reject(err);
        else resolve(row.count || 0);
      });
    });
  },

  countBuried(userId: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = "SELECT COUNT(*) as count FROM words WHERE status = 'buried' AND user_id = ?";
      db.get(sql, [userId], (err, row: any) => {
        if (err) reject(err);
        else resolve(row.count || 0);
      });
    });
  },

  getRandomExclude(userId: number, status: string, excludeIds: number[]): Promise<Word | null> {
    return new Promise((resolve, reject) => {
      let statusCondition = status === 'active' ? "(status = 'active' OR status IS NULL)" : "status = 'buried'";
      if (excludeIds.length === 0) {
        const sql = `SELECT * FROM words WHERE ${statusCondition} AND user_id = ? ORDER BY RANDOM() LIMIT 1`;
        db.get(sql, [userId], (err, row) => {
          if (err) reject(err);
          else resolve(row as Word || null);
        });
      } else {
        const placeholders = excludeIds.map(() => '?').join(',');
        const sql = `SELECT * FROM words WHERE ${statusCondition} AND user_id = ? AND id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`;
        db.get(sql, [userId, ...excludeIds], (err, row) => {
          if (err) reject(err);
          else resolve(row as Word || null);
        });
      }
    });
  }
};

