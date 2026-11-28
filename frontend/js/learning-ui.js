// Local-first progress portability and classroom handoff: no student accounts or names.
function currentAssignment() {
  const q=new URLSearchParams(location.search);
  return {code:(q.get('assignment')||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32),module:Object.hasOwn(CAREER_LABELS,q.get('module'))?q.get('module'):'it',independent:q.get('mode')==='independent'};
}
function learningHistoryMarkup(module,attempts=[]) {
  const rows=attempts.filter(a=>a.module===module).slice(-8).reverse();
  if(!rows.length) return '';
  return `<details class="attempt-history"><summary>${gameText('История упражнений','Exercise history','Жаттығулар тарихы')} · ${rows.length}</summary><ol class="attempt-list">${rows.map(a=>`<li><strong>${a.score}% · ${careerModeLabel(a.mode)}</strong><time datetime="${a.at}">${new Date(a.at).toLocaleString(getLanguage()==='kk'?'kk-KZ':getLanguage())}</time><span>${Object.entries(a.skills).map(([id,score])=>escapeHtml(assessmentDescriptor(module,id).label)+': '+score+'%').join(' · ')}</span><p class="profile-note">${escapeHtml(a.caseId)} · v${a.scoringVersion??'?'}${a.untimed?' · '+gameText('Без таймера','Untimed','Таймерсіз'):''}</p></li>`).join('')}</ol></details>`;
}
function learningDownload(name,text,type='application/json') {
  const url=URL.createObjectURL(new Blob([text],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function learningStatus(message) { const el=document.getElementById('learningStatus');if(el) el.textContent=message; }
function exportLearning(kind) {
  learningDownload('synapkor-progress.'+kind,kind==='csv'?learningCsv(loadCareerProfile().attempts):learningBackup(),kind==='csv'?'text/csv;charset=utf-8':'application/json');
}
async function restoreLearning(input) {
  const file=input.files?.[0]; if(!file) return;
  const result=file.size<=1024*1024?importLearningBackup(await file.text()):{ok:false};
  renderCareerProfile();
  learningStatus(result.ok?gameText('Прогресс объединён. Повторный импорт не создаёт копий.','Progress merged. Repeated imports do not create copies.','Ілгерілеу біріктірілді. Қайта импорттау көшірме жасамайды.'):gameText('Не удалось импортировать файл. Текущий прогресс сохранён.','Could not import this file. Your current progress is unchanged.','Файл импортталмады. Ағымдағы ілгерілеу сақталды.'));
  input.value='';
}
function clearLearning(button) {
  if(button.dataset.confirm!=='yes') {button.dataset.confirm='yes';button.textContent=gameText('Подтвердить удаление прогресса','Confirm progress deletion','Ілгерілеуді жоюды растау');return;}
  try { for(const key of ['synapkor_profile_v1','synapkor_profile_v2','synapkor_drills_v1','synapkor_checkpoint_v1']) localStorage.removeItem(key);
    renderCareerProfile();renderLearningHub();learningStatus(gameText('Прогресс удалён с этого устройства.','Progress deleted from this device.','Ілгерілеу осы құрылғыдан жойылды.'));
  }catch{learningStatus(gameText('Хранилище недоступно.','Storage is unavailable.','Жад қолжетімсіз.'));}
}
function assignmentUrl(module,mode,code,untimed) {
  const url=new URL(location.href);url.search='';url.hash='';
  url.searchParams.set('lang',getLanguage());url.searchParams.set('module',module);url.searchParams.set('mode',mode);
  if(code) url.searchParams.set('assignment',code.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32));
  if(untimed) url.searchParams.set('untimed','1');return url.href;
}
function buildAssignment(event) {
  event.preventDefault();const form=event.target;
  const link=assignmentUrl(form.elements.profession.value,form.elements.mode.value,form.elements.code.value,form.elements.untimed.checked);
  const output=document.getElementById('assignmentLink');output.value=link;output.hidden=false;output.focus();output.select();
}
function startAssignedRun() {
  const a=currentAssignment();
  if(a.module==='safety') startSafetyVR();else if(a.module==='barista') startBaristaVR();else startScenario(a.module);
  independentRun=a.independent;if(a.independent)setGuideVisible(false);
}
async function collectClassroom(input) {
  let records=[],files=0;
  for(const file of Array.from(input.files||[]).slice(0,50)) {
    try { if(file.size>1024*1024) continue;const v=JSON.parse(await file.text());
      if(v.format!=='synapkor-learning'||v.version!==1)continue;
      const rows=normalizeAttempts(v.profile?.attempts); if(!rows.length)continue;
      files++;records.push(...rows);
    } catch { /* A malformed handoff must not break the other files. */ }
  }
  if(records.length) {
    // Each device keeps 120 records; class collection retains all selected devices.
    const unique=[...new Map(records.map(a=>[a.id,a])).values()];
    learningDownload('synapkor-classroom.csv',learningCsv(unique,true),'text/csv;charset=utf-8');
  }
  learningStatus(gameText('Файлов с результатами: ','Result files: ','Нәтиже файлдары: ')+files);
  input.value='';
}
function renderLearningHub() {
  const box=document.getElementById('learningHub');if(!box)return;
  const a=currentAssignment();
  box.innerHTML=`<div class="section-head"><h2>${gameText('Ваша учебная папка','Your learning folder','Оқу қалтаңыз')}</h2><span class="section-note">${gameText('Хранится на устройстве','Saved on this device','Осы құрылғыда сақталады')}</span></div>
    ${a.code?`<div class="assignment-banner"><strong>${gameText('Задание','Assignment','Тапсырма')}: ${escapeHtml(a.code)} · ${careerLabel(a.module)}</strong><button type="button" class="btn-action" onclick="startAssignedRun()">${gameText('Начать задание','Start assignment','Тапсырманы бастау')}</button></div>`:''}
    <p class="profile-note">${gameText('Сохраните резервную копию перед сменой устройства. Подробная история: последние 120 смен; счётчик попыток сохраняется.','Back up before changing devices. Detailed history keeps the latest 120 shifts; lifetime attempt counts are preserved.','Құрылғыны ауыстырмас бұрын сақтық көшірме жасаңыз. Толық тарих соңғы 120 ауысымды сақтайды; барлық әрекет саны сақталады.')}</p>
    <div class="profile-tools"><button type="button" onclick="exportLearning('json')">${gameText('Скачать копию JSON','Download JSON backup','JSON көшірмесін жүктеу')}</button><button type="button" onclick="exportLearning('csv')">${gameText('Экспорт CSV','Export CSV','CSV экспорты')}</button><label>${gameText('Восстановить копию','Restore backup','Көшірмені қалпына келтіру')}<input type="file" accept="application/json,.json" onchange="restoreLearning(this)"></label><button type="button" onclick="clearLearning(this)">${gameText('Удалить мой прогресс','Delete my progress','Ілгерілеуімді жою')}</button></div>
    <p id="learningStatus" class="profile-status" role="status" aria-live="polite"></p>
    <details class="classroom-tools"><summary>${gameText('Для преподавателя: задание и сбор результатов','For teachers: assignments and results','Оқытушыға: тапсырмалар мен нәтижелер')}</summary>
    <p class="profile-note">${gameText('Создайте ссылку и соберите JSON-файлы участников. CSV формируется здесь, без загрузки на сервер. Не используйте имена в коде группы. Баллы вводятся клиентом и не подтверждают квалификацию.','Share an assignment link and collect learners’ JSON files. The class CSV is generated here without server uploads. Keep names out of class codes. Scores are client-reported practice evidence, not verified qualifications.','Тапсырма сілтемесін таратып, қатысушылардың JSON файлдарын жинаңыз. Топтың CSV файлы серверге жүктелмей осы жерде жасалады. Топ кодына есімдерді жазбаңыз. Балдар — клиент хабарлаған оқу нәтижелері, расталған біліктілік емес.')}</p>
    <form onsubmit="buildAssignment(event)" class="assignment-form"><label>${gameText('Профессия','Profession','Кәсіп')}<select name="profession">${Object.keys(CAREER_LABELS).map(m=>`<option value="${m}">${careerLabel(m)}</option>`).join('')}</select></label><label>${gameText('Режим','Mode','Режим')}<select name="mode"><option value="guided">${careerModeLabel('guided')}</option><option value="independent">${careerModeLabel('independent')}</option></select></label><label>${gameText('Код группы (A–Z, 0–9)','Class code (A–Z, 0–9)','Топ коды (A–Z, 0–9)')}<input name="code" maxlength="32" pattern="[A-Za-z0-9_-]*" placeholder="CLASS-01"></label><label class="check-option"><input type="checkbox" name="untimed">${gameText('Без таймера решений','Untimed decisions','Шешімдер таймерсіз')}</label><button class="btn-action" type="submit">${gameText('Создать ссылку','Create link','Сілтеме жасау')}</button></form>
    <input id="assignmentLink" readonly hidden aria-label="${gameText('Ссылка на задание','Assignment link','Тапсырма сілтемесі')}">
    <div class="profile-tools"><label>${gameText('Собрать файлы в CSV','Collect files into CSV','Файлдарды CSV-ге жинау')}<input type="file" accept="application/json,.json" multiple onchange="collectClassroom(this)"></label></div></details>`;
}
window.addEventListener('DOMContentLoaded',renderLearningHub);
window.addEventListener('synapkor:language',renderLearningHub);
