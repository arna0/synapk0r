const SETTINGS_KEY='synapkor_settings_v1';
let gameSettings={muted:false,sensitivity:1,untimed:false};
try {const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');gameSettings={muted:s.muted===true,sensitivity:typeof s.sensitivity==='number'&&Number.isFinite(s.sensitivity)?Math.max(.4,Math.min(2,s.sensitivity)):1,untimed:s.untimed===true};}catch{}
if(new URLSearchParams(location.search).get('untimed')==='1') gameSettings.untimed=true;
function saveGameSetting(key,value) {
  if(key==='sensitivity')value=Math.max(.4,Math.min(2,Number(value)||1));
  if(key==='untimed' && value===true)untimedUsed=true;
  if(['muted','sensitivity','untimed'].includes(key))gameSettings[key]=value;
  try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(gameSettings));}catch{}
  if(typeof updateAudioSettings==='function')updateAudioSettings();
}
function openSettings() {
  let dialog=document.getElementById('settingsDialog');if(!dialog)return;
  const active=document.getElementById('gameScreen')?.classList.contains('active') || (typeof practiceDrillHost === 'function' && practiceDrillHost());
  if(active) {pauseGameClock(true);resetGameInputs();document.exitPointerLock?.();if(typeof updateAudioSettings==='function')updateAudioSettings();}
  renderSettings();if(!dialog.open)dialog.showModal();
}
function closeSettings() {
  const dialog=document.getElementById('settingsDialog');if(dialog?.open)dialog.close();
  pauseGameClock(false);if(typeof updateAudioSettings==='function')updateAudioSettings();
  if(typeof requestSceneFrame==='function')requestSceneFrame();
}
function renderSettings() {
  const d=document.getElementById('settingsDialog');if(!d)return;
  d.innerHTML=`<h2 id="settingsHeading">${gameText('Настройки и пауза','Settings and pause','Баптаулар және үзіліс')}</h2><p>${gameText('Во время паузы упражнения и таймеры остановлены.','Exercises and timers stop while paused.','Үзіліс кезінде жаттығулар мен таймерлер тоқтайды.')}</p>
  <label class="setting-row"><span>${gameText('Выключить звук','Mute all sounds','Барлық дыбысты өшіру')}</span><input type="checkbox" ${gameSettings.muted?'checked':''} onchange="saveGameSetting('muted',this.checked)"></label>
  <label class="setting-row"><span>${gameText('Чувствительность камеры','Camera sensitivity','Камера сезімталдығы')}</span><input type="range" min="0.4" max="2" step="0.1" value="${gameSettings.sensitivity}" oninput="saveGameSetting('sensitivity',this.value)"></label>
  <label class="setting-row"><span>${gameText('Без таймера решений','Untimed decisions','Шешімдер таймерсіз')}</span><input type="checkbox" ${gameSettings.untimed?'checked':''} onchange="saveGameSetting('untimed',this.checked)"></label>
  <p>${gameText('Время измерения и точность движений остаются частью практических упражнений. Настройка без таймера отмечается в истории.','Measurement timing and movement accuracy remain part of practical exercises. Untimed practice is marked in your history.','Өлшеу уақыты мен қозғалыс дәлдігі практикалық жаттығулардың бөлігі болып қалады. Таймерсіз жаттығу тарихта белгіленеді.')}</p>
  <div class="settings-languages">${[['ru','Рус'],['kk','Қаз'],['en','Eng']].map(([lang,label])=>`<button type="button" onclick="setLanguage('${lang}')" aria-pressed="${getLanguage()===lang}">${label}</button>`).join('')}</div>
  <button class="btn-action" type="button" onclick="closeSettings()">${gameText('Продолжить','Continue','Жалғастыру')}</button>`;
}
window.addEventListener('DOMContentLoaded',()=>{
  const d=document.getElementById('settingsDialog');d?.addEventListener('cancel',e=>{e.preventDefault();closeSettings();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&(document.getElementById('gameScreen')?.classList.contains('active') || (typeof practiceDrillHost === 'function' && practiceDrillHost())))openSettings();});
});
window.addEventListener('synapkor:language',()=>{renderSettings();document.querySelectorAll('[data-settings-button]').forEach(b=>b.textContent=gameText('Пауза · настройки','Pause · settings','Үзіліс · баптаулар'));});
