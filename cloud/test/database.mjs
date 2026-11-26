import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
// Execute production SQL against SQLite; adapt only the D1 result shape.
export function database(filename = ':memory:', migrate = true) {
  const sql = new DatabaseSync(filename);
  if (migrate) for (const file of readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort()) sql.exec(readFileSync('drizzle/' + file, 'utf8'));
  const db = {
    close: () => sql.close(), withSession: () => db,
    prepare(query) {
      let args = [];
      const stmt = {
        bind(...values) { args = values; return stmt; },
        async first() { return sql.prepare(query).get(...args) || null; },
        async all() { return { results: sql.prepare(query).all(...args), success: true }; },
        async run() { const r = sql.prepare(query).run(...args); return { results: [], success: true, meta: { changes: Number(r.changes) } }; },
        execute() { return { results: sql.prepare(query).all(...args), success: true }; }
      }; return stmt;
    },
    async batch(statements) {
      sql.exec('BEGIN');
      try { const r = statements.map(s => s.execute()); sql.exec('COMMIT'); return r; }
      catch (e) { sql.exec('ROLLBACK'); throw e; }
    }
  }; return db;
}
