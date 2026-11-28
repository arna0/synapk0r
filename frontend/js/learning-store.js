// Portable learning evidence. Completed shifts and short drills are separate records.
const LEARNING_LIMIT = 120;
const learningString = (value, max=100) => typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g,'').slice(0,max) : '';
function normalizeLearningAttempt(value) {
  if (!value || !Object.hasOwn(ASSESSMENT_SKILLS,value.module) || !['guided','independent'].includes(value.mode) || !careerScore(value.score)) return null;
  const at = typeof value.at === 'string' && Number.isFinite(Date.parse(value.at)) ? new Date(value.at).toISOString() : null;
  const id = learningString(value.id,120);
  if (!at || !id) return null;
  const skills = {};
  for (const skill of [...ASSESSMENT_SKILLS[value.module],'accuracy','hard','soft','service','purchasing','procedure']) if (careerScore(value.skills?.[skill])) skills[skill] = Math.round(value.skills[skill]);
  return {id,module:value.module,mode:value.mode,score:Math.round(value.score),at,skills,
    caseId:learningString(value.caseId),scenarioVersion:learningString(value.scenarioVersion),
    scoringVersion:Number.isInteger(value.scoringVersion) && value.scoringVersion>=1 && value.scoringVersion<=100 ? value.scoringVersion : null,
    guidedActions:Number.isInteger(value.guidedActions) && value.guidedActions>=0 ? Math.min(100000,value.guidedActions) : 0,
    durationSec:typeof value.durationSec==='number' && Number.isFinite(value.durationSec) && value.durationSec>=0 ? Math.min(86400,value.durationSec) : null,
    untimed:value.untimed===true,assignment:learningString(value.assignment,32)};
}
function normalizeAttempts(values) {
  const byId=new Map();
  if (Array.isArray(values)) for (const v of values.slice(-1000)) { const a=normalizeLearningAttempt(v); if(a && !byId.has(a.id)) byId.set(a.id,a); }
  return [...byId.values()].sort((a,b)=>a.at.localeCompare(b.at)).slice(-LEARNING_LIMIT);
}
function learningBackup() { return JSON.stringify({format:'synapkor-learning',version:1,exportedAt:new Date().toISOString(),profile:loadCareerProfile()},null,2); }
function importLearningBackup(text) {
  try {
    if (typeof text!=='string' || text.length>1024*1024) return {ok:false};
    const raw=JSON.parse(text);
    if (raw?.format!=='synapkor-learning' || raw.version!==1 || raw.profile?.version!==2 || !raw.profile.professions || Array.isArray(raw.profile.professions)) return {ok:false};
    const incoming=normalizeCareerProfile(raw.profile), current=loadCareerProfile();
    const attempts=normalizeAttempts([...(current.attempts||[]),...incoming.attempts]);
    for (const module of Object.keys(CAREER_LABELS)) {
      const target=current.professions[module] ||= {};
      for (const mode of ['guided','independent','legacy']) {
        const a=target[mode],b=incoming.professions[module]?.[mode]; if (!b) continue;
        if (!a) { target[mode]=b; continue; }
        const newer=(b.lastAt||'')>(a.lastAt||'') ? b:a;
        const older=(b.firstAt||'9999')<(a.firstAt||'9999') ? b:a;
        const count=attempts.filter(r=>r.module===module && r.mode===mode).length;
        target[mode]={...newer,runs:Math.max(a.runs,b.runs,count)};
        if(mode!=='legacy') { target[mode].first=older.first; if(older.firstAt) target[mode].firstAt=older.firstAt; }
      }
      if (!Object.keys(target).length) delete current.professions[module];
    }
    current.attempts=attempts;
    // A single write after full validation preserves the previous data on failure.
    localStorage.setItem(PROFILE_KEY,JSON.stringify(current));
    return {ok:true,count:attempts.length};
  } catch { return {ok:false}; }
}
function learningCsv(attempts, classroom = false) {
  const cell=v=>'"'+String(v??'').replace(/^\s*[=+@-]/,"'$&").replace(/"/g,'""')+'"';
  const skills=[...new Set(Object.values(ASSESSMENT_SKILLS).flat()),'accuracy','hard','soft','service','purchasing','procedure'];
  const fields=['attempt_id','date','profession','mode','score','case','scenario_version','scoring_version','guided_actions','duration_sec','untimed','assignment',...skills];
  const normalized=classroom ? attempts.map(normalizeLearningAttempt).filter(Boolean).slice(0,6000) : normalizeAttempts(attempts);
  const rows=normalized.map(a=>[a.id,a.at,a.module,a.mode,a.score,a.caseId,a.scenarioVersion,a.scoringVersion,a.guidedActions,a.durationSec,a.untimed,a.assignment,...skills.map(k=>a.skills[k]??'')]);
  return [fields,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
}
