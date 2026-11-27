// Pure incident model. The room and exercise UI consume the same facts and transitions.
// Loaded as a classic script in the browser; deliberately independent of DOM and Three.js.
const ITIncident = (() => {
  const VERSION = 'it-incidents-2';
  const STAGES = ['triage', 'evidence', 'diagnose', 'repair', 'verify'];
  const CASES = [
    {
      id: 'network-link', number: 412,
      title: ['Потеря сети db-01', 'db-01 network loss', 'db-01 желісі үзілді'],
      evidenceId: 'network-unreachable', diagnosisId: 'disconnected-cable', repairId: 'reconnect-eth0',
      diagnosisTarget: 'serverDb', repairTarget: 'patchCable',
      logs: [
        '10:41:58 INFO GET /cart 200',
        '10:42:07 WARN db-01:5432 connect failed: Network is unreachable',
        '10:42:08 ERROR POST /checkout 503',
        '10:42:09 WARN /ready dependency check failed'
      ],
      evidenceIndex: 1,
      inspection: ['db-01 power: ON', 'eth0: NO-CARRIER / LINK DOWN', 'Patch cable: disconnected', 'PostgreSQL: active (running)'],
      afterRepair: ['eth0: LINK UP / 1 Gbit/s', 'db-01:5432 connected', 'shop-api: connection pool recovered'],
      cause: ['Отключился сетевой кабель базы данных.', 'The database network cable was disconnected.', 'Дерекқордың желілік кабелі ажыраған.'],
      prevention: ['Закрепим кабель и добавим оповещение о потере связи.', 'We will secure the cable and add a link-loss alert.', 'Кабельді бекітіп, байланыс үзілгенде хабарлау қосамыз.']
    },
    {
      id: 'database-service', number: 413,
      title: ['Служба PostgreSQL остановлена', 'PostgreSQL service stopped', 'PostgreSQL қызметі тоқтаған'],
      evidenceId: 'connection-refused', diagnosisId: 'stopped-database', repairId: 'start-postgresql',
      diagnosisTarget: 'terminal', repairTarget: 'terminal',
      logs: [
        '11:05:12 INFO GET /cart 200',
        '11:05:13 WARN db-01:5432 connect failed: Connection refused',
        '11:05:14 ERROR POST /checkout 503',
        '11:05:15 INFO db-01 ping: 0% packet loss'
      ],
      evidenceIndex: 1,
      inspection: ['db-01 ping: reachable / 1 ms', 'eth0: LINK UP', 'postgresql: inactive (dead)', 'Maintenance log: stopped; start omitted'],
      afterRepair: ['$ sudo systemctl start postgresql', 'postgresql: active (running)', 'db-01:5432 accepting connections'],
      cause: ['После обслуживания не запустили службу базы данных.', 'The database service was not started after maintenance.', 'Техникалық қызметтен кейін дерекқор қызметі іске қосылмаған.'],
      prevention: ['Добавим проверку запуска службы в регламент обслуживания.', 'We will add a service-start check to the maintenance checklist.', 'Қызмет көрсету тізіміне қызметтің іске қосылуын тексеруді қосамыз.']
    },
    {
      id: 'release-config', number: 414,
      title: ['Ошибка конфигурации релиза', 'Release configuration error', 'Релиз конфигурациясының қатесі'],
      evidenceId: 'authentication-failed', diagnosisId: 'wrong-secret', repairId: 'rollback-config',
      diagnosisTarget: 'terminal', repairTarget: 'terminal',
      logs: [
        '14:20:00 INFO deploy shop-api v2.8; config db-secret-v8',
        '14:20:01 ERROR db-01:5432 password authentication failed for user shop',
        '14:20:02 ERROR POST /checkout 503',
        '14:20:03 INFO db-01 ping: OK; postgresql: active'
      ],
      evidenceIndex: 1,
      inspection: ['eth0: LINK UP; postgresql: active', 'Previous: v2.7 / db-secret-v7 / checkout OK', 'Current: v2.8 / db-secret-v8 / auth failed', 'Approved rollback: v2.7 + db-secret-v7'],
      afterRepair: ['$ deploy rollback shop-api --release v2.7', 'config: db-secret-v7 restored', 'db-01:5432 authenticated'],
      cause: ['Новый релиз использовал неверные данные доступа к базе.', 'The new release used incorrect database credentials.', 'Жаңа релиз дерекқорға қате кіру деректерін қолданған.'],
      prevention: ['Проверим конфигурацию релиза и тестовую покупку до следующего выпуска.', 'We will validate release configuration and a test purchase before the next release.', 'Келесі шығарылымға дейін конфигурация мен сынақ сатып алуды тексереміз.']
    }
  ];

  function getCase(id) { return CASES.find(item => item.id === id) || CASES[0]; }
  function nextCase(lastId) { return CASES[(CASES.findIndex(item => item.id === lastId) + 1) % CASES.length]; }
  function createRun(caseId, startedAt = 0) {
    return { version: VERSION, caseId: getCase(caseId).id, stage: 0, startedAt, repaired: false, restoredAt: null, checks: [], results: {} };
  }
  function completeExercise(run, exerciseId, result, now) {
    const stage = STAGES[run.stage];
    if (!stage || exerciseId !== 'it.' + stage || !result || result.correct !== true) return run;
    const data = getCase(run.caseId);
    const expected = { triage: 'checkout-impact', evidence: data.evidenceId, diagnose: data.diagnosisId, repair: data.repairId };
    if (stage !== 'verify' && result.choiceId !== expected[stage]) return run;
    const checks = Array.from(new Set(result.checks || []));
    if (stage === 'verify' && (!run.repaired || !checks.includes('health') || !checks.includes('checkout'))) return run;
    return {
      ...run, stage: run.stage + 1,
      repaired: run.repaired || stage === 'repair',
      restoredAt: stage === 'verify' ? Math.max(run.startedAt, now) : run.restoredAt,
      checks: stage === 'verify' ? checks : run.checks,
      results: { ...run.results, [stage]: { ...result } }
    };
  }
  function restorationSeconds(run) { return run.restoredAt === null ? null : Math.round((run.restoredAt - run.startedAt) / 1000); }
  return { VERSION, STAGES, CASES, getCase, nextCase, createRun, completeExercise, restorationSeconds };
})();
