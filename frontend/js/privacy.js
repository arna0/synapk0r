// Device receipts contain deletion capabilities. They are never included in public reviews.
function downloadSurveyReceipts(rows = loadSurveyResponses()) {
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), feedback: rows }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'synapkor-feedback-receipts.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function privacyText(ru, en, kk) { return surveyText(ru, en, kk); }
function savePrivacyRows(rows) {
  localStorage.setItem(SURVEY_KEY, JSON.stringify(rows));
  window.dispatchEvent(new Event('survey-synced'));
}
async function deleteDeviceFeedback(id) {
  const row = loadSurveyResponses().find(item => item.id === id);
  if (!row) return;
  if (!confirm(privacyText('Удалить этот отзыв на устройстве и запросить удаление у команды? Отменить нельзя.', 'Delete this feedback on this device and request deletion from the team? This cannot be undone.', 'Пікірді құрылғыдан жойып, топтан да жоюды сұрайсыз ба? Қайтару мүмкін емес.'))) return;
  // Persist the queue stop before waiting for an in-flight upload. A network failure keeps this receipt for an explicit retry.
  savePrivacyRows(loadSurveyResponses().map(item => item.id === id ? { ...item, deletionPending: true } : item));
  if (typeof activeSurveyUploads !== 'undefined') await activeSurveyUploads.get(id)?.catch(() => {});
  const uploadedOrConsented = row.synced || row.uploadConsent === true || row.publish === true;
  if (uploadedOrConsented) {
    if (!row.delete_token) throw new Error(privacyText('Старая квитанция без ключа: очередь остановлена. Удаление на сервере требует помощи владельца проекта. ID: ', 'This older receipt has no deletion key. Upload retries stopped. Ask the project owner to delete server feedback. ID: ', 'Ескі түбіртекте жою кілті жоқ. Жіберу тоқтатылды. Серверден жою үшін жоба иесіне хабарласыңыз. ID: ') + id);
    const base = getApiBase(); if (base === null) throw new Error(privacyText('Нет связи с сервером. Очередь остановлена; квитанция сохранена для повтора.', 'Server unavailable. Upload retries stopped; your receipt is kept so you can retry deletion.', 'Сервер қолжетімсіз. Жіберу тоқтатылды, жоюды қайталау үшін түбіртек сақталды.'));
    try {
      const response = await fetch(base + '/api/reviews/' + encodeURIComponent(id), { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delete_token: row.delete_token }), signal: AbortSignal.timeout(8000) });
      if (!response.ok || (await response.json()).ok !== true) throw new Error('Deletion not confirmed');
    } catch {
      throw new Error(privacyText('Удаление на сервере не подтверждено. Отзыв исключён из очереди; квитанция сохранена. Повторите удаление при подключении.', 'Server deletion is not confirmed. Upload retries stopped and your receipt is kept. Retry deletion when connected.', 'Серверден жою расталмады. Жіберу тоқтатылып, түбіртек сақталды. Байланыс орнағанда қайта жойыңыз.'));
    }
  }
  savePrivacyRows(loadSurveyResponses().filter(item => item.id !== id));
}
function renderPrivacyTools() {
  const root = document.getElementById('privacyTools'); if (!root) return;
  root.replaceChildren();
  const title = document.createElement('h2'); title.textContent = privacyText('Мои отзывы и данные', 'My feedback and data', 'Менің пікірлерім мен деректерім'); root.append(title);
  const note = document.createElement('p'); note.textContent = privacyText('Квитанции хранятся на этом устройстве. JSON содержит секретные ключи удаления: храните его приватно. Удаление отзыва также убирает его из публичных итогов. Очистка данных браузера уничтожит ключи; старые отзывы удаляет владелец проекта.', 'Receipts stay on this device. The JSON contains secret deletion keys: keep it private. Deleting feedback also removes it from public totals. Clearing browser data loses these keys; the project owner can remove older feedback.', 'Түбіртектер осы құрылғыда сақталады. JSON құпия жою кілттерін қамтиды: оны жарияламаңыз. Пікір жойылса, жалпы қорытындыдан да алынады. Браузер деректерін тазалау кілттерді жояды; ескі пікірлерді жоба иесі жоя алады.'); root.append(note);
  const download = document.createElement('button'); download.type = 'button'; download.className = 'btn-secondary'; download.textContent = privacyText('Скачать мои квитанции (JSON)', 'Download my receipts (JSON)', 'Түбіртектерімді жүктеу (JSON)'); download.onclick = () => downloadSurveyReceipts(); root.append(download);
  const status = document.createElement('p'); status.setAttribute('role', 'status'); root.append(status);
  const rows = loadSurveyResponses();
  if (!rows.length) { const empty = document.createElement('p'); empty.textContent = privacyText('На этом устройстве отзывов нет.', 'No feedback on this device.', 'Бұл құрылғыда пікірлер жоқ.'); root.append(empty); }
  rows.forEach((row, index) => {
    const line = document.createElement('p'), label = document.createElement('span');
    label.textContent = [row.module || '', String(row.at || '').slice(0, 10), row.deletionPending ? privacyText('удаление ожидает подтверждения', 'deletion pending', 'жою расталмады') : row.synced ? privacyText('отправлен', 'sent', 'жіберілді') : privacyText('на устройстве', 'on device', 'құрылғыда')].join(' · ') + ' ';
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn-secondary'; remove.textContent = privacyText('Удалить', 'Delete', 'Жою');
    remove.onclick = async () => {
      remove.disabled = true;
      try {
        if (row.id) await deleteDeviceFeedback(row.id);
        else if (confirm(privacyText('Удалить старый локальный ответ? Это не удаляет возможную копию у команды.', 'Remove this older local answer? Any copy held by the team is unaffected.', 'Ескі жергілікті жауап жойылсын ба? Топтағы көшірме жойылмайды.'))) { const current=loadSurveyResponses(); current.splice(index,1); savePrivacyRows(current); }
        renderPrivacyTools();
      } catch (error) { renderPrivacyTools(); const message = root.querySelector('[role="status"]'); if (message) message.textContent = error.message; }
    };
    line.append(label, remove); root.append(line);
  });
}
window.addEventListener('DOMContentLoaded', renderPrivacyTools);
window.addEventListener('survey-synced', renderPrivacyTools);
window.addEventListener('synapkor:language', renderPrivacyTools);
window.addEventListener('storage', event => { if (event.key === SURVEY_KEY) renderPrivacyTools(); });
