// Single-process append-only store. Configure SURVEY_FILE on a persistent volume.
import { mkdir, readFile, open } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function createSurveyStore(file) {
  let rows;
  let queue = Promise.resolve();
  async function load() {
    if (rows) return rows;
    let content;
    try { content = await readFile(file, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; content = ''; }
    rows = content.split('\n').filter(Boolean).flatMap(line => {
      try { const row = JSON.parse(line); return row && row.answers ? [row] : []; }
      catch { console.warn('[survey] Skipping a damaged record'); return []; }
    });
    return rows;
  }
  function locked(work) {
    const result = queue.then(work);
    queue = result.catch(() => {});
    return result;
  }
  return {
    all: () => locked(async () => [...await load()]),
    add: survey => locked(async () => {
      const list = await load();
      const existing = survey.id && list.find(row => row.id === survey.id);
      if (existing) return { id: existing.id, duplicate: true };
      const row = { ...survey, id: survey.id || randomUUID() };
      await mkdir(path.dirname(file), { recursive: true });
      // Newline before each record isolates a partial last line after a crash.
      const handle = await open(file, 'a');
      try { await handle.writeFile('\n' + JSON.stringify(row) + '\n', 'utf8'); await handle.sync(); }
      finally { await handle.close(); }
      list.push(row);
      return { id: row.id, duplicate: false };
    })
  };
}
