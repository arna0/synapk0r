// Single-process serialized store. Configure SURVEY_FILE on a persistent volume.
import { mkdir, readFile, open, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { hashSecret } from './review-auth.js';

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
      const { delete_token, ...safeSurvey } = survey;
      const row = { ...safeSurvey, id: survey.id || randomUUID(), ...(delete_token ? { delete_token_hash: await hashSecret(delete_token) } : {}) };
      await mkdir(path.dirname(file), { recursive: true });
      // Newline before each record isolates a partial last line after a crash.
      const handle = await open(file, 'a', 0o600);
      try { await handle.writeFile('\n' + JSON.stringify(row) + '\n', 'utf8'); await handle.sync(); }
      finally { await handle.close(); }
      list.push(row);
      return { id: row.id, duplicate: false };
    }),
    remove: (id, authorize) => locked(async () => {
      const list=await load(); const index=list.findIndex(row=>row.id===id);
      if (!await authorize(index<0 ? null : list[index])) return { authorized:false, deleted:false };
      if (index<0) return { authorized:true, deleted:false };
      const remaining=list.filter((_,i)=>i!==index), temp=file+'.'+randomUUID()+'.tmp';
      await mkdir(path.dirname(file),{recursive:true});
      try {
        const handle=await open(temp,'wx',0o600);
        try { await handle.writeFile(remaining.map(r=>JSON.stringify(r)).join('\n')+(remaining.length?'\n':''),'utf8'); await handle.sync(); }
        finally { await handle.close(); }
        // Same-directory replacement is atomic. Memory changes only after sync and rename succeed.
        await rename(temp,file); rows=remaining;
      } finally { await rm(temp,{force:true}); }
      return {authorized:true,deleted:true};
    })
  };
}
