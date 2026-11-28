import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function translations() {
  const ctx = vm.createContext({ window: { addEventListener() {} } });
  for (const name of ['i18n-en.js', 'i18n-en-game.js', 'i18n.js', 'i18n-kk-game.js', 'i18n-game-extra.js']) {
    const path = new URL(`../js/${name}`, import.meta.url);
    vm.runInContext(readFileSync(path, 'utf8'), ctx, { filename: name });
  }
  return { ctx, ...vm.runInContext('({EN, KK})', ctx) };
}
const literal = "'(?:\\\\.|[^'\\\\])*'";
const calls = new RegExp(`\\bT\\((${literal}),\\s*(${literal})\\)`, 'g');
const source = readFileSync(new URL('../js/minigames.js', import.meta.url), 'utf8');
const pairs = [...source.matchAll(calls)].map(m => [vm.runInNewContext(m[1]), vm.runInNewContext(m[2])]);

test('every English interface key has a nonempty Kazakh translation', () => {
  const { EN, KK } = translations();
  const missing = Object.keys(EN).filter(key => typeof KK[key] !== 'string' || !KK[key].trim());
  assert.deepEqual(missing, []);
});

test('all literal mini-game prompts and hazard choices are translated in both languages', () => {
  const { EN, KK, ctx } = translations();
  const hazards = [...source.matchAll(/\{ ru: ('(?:\\.|[^'\\])*'), en: ('(?:\\.|[^'\\])*')/g)]
    .map(m => [vm.runInNewContext(m[1]), vm.runInNewContext(m[2])]);
  assert.ok(pairs.length > 100, 'extract the mini-game prompts, not an empty list');
  for (const [ru] of [...pairs, ...hazards]) {
    assert.ok(EN[ru]?.trim(), `Missing English: ${ru}`);
    assert.ok(KK[ru]?.trim(), `Missing Kazakh: ${ru}`);
    for (const [lang, expected] of [['en', EN[ru]], ['kk', KK[ru]]]) {
      vm.runInContext(`currentLang = '${lang}'`, ctx);
      assert.equal(vm.runInContext(`translateString(${JSON.stringify(ru)})`, ctx), expected, `${lang}: ${ru}`);
    }
  }
});

test('critical controls and safety instructions retain their meaning in Kazakh', () => {
  const { KK } = translations();
  assert.equal(KK['7 шагов'], '7 қадам');
  assert.equal(KK['Проверьте отсутствие напряжения'], 'Кернеудің жоқтығын тексеріңіз');
  assert.match(KK['Есть напряжение — стоп'], /Кернеу бар.*тоқта/i);
  assert.match(KK['Наденьте СИЗ'], /ЖҚҚ.*киіңіз/);
  assert.match(KK['Измерьте температуру'], /Температураны өлшеңіз/);
});

test('dynamic guide, readings and mini-game feedback translate with their numbers intact', () => {
  const { ctx } = translations();
  vm.runInContext("currentLang = 'kk'", ctx);
  const samples = [
    ['Гид · шаг 2 из 7', 'Гид · 7 қадамның 2-қадамы'],
    ['Пройдено 3 из 7', '7 ішінен 3 өтілді'],
    ['4–6 минут', '4–6 минут'],
    ['Найдите «Кофемолка» и нажмите [E]', '«Кофе тартқыш» тауып, [E] басыңыз'],
    ['Найдено 3 из 4, ложных 1', '4 қауіптің 3-і табылды, қате таңдау: 1'],
    ['Пар проверено: 4 из 6', 'Тексерілген жұптар: 6 ішінен 4'],
    ['17.5 г — мало: кофе выйдет кислым и водянистым', '17.5 г — аз: кофе қышқыл әрі сұйық болады'],
    ['27 с — сбалансированный вкус', '27 с — дәмі теңгерілген'],
    ['eth3: нет линка. Кабель выпал отсюда.', 'eth3: байланыс жоқ. Кабель осы жерден шығып кеткен.'],
    ['В ритм: 8 из 10 ударов. Пульс ≈ 96 в минуту', 'Ырғаққа сай: 10 соққының 8-і. Пульс ≈ минутына 96'],
    ['Вы: 125/80. Верно: 125/80 мм рт. ст.', 'Сіз: 125/80. Дұрысы: 125/80 мм сын. бағ.'],
    ['верхнее: 125', 'систолалық: 125'],
    ['нижнее: 80', 'диастолалық: 80'],
    ['послушано 4/6', 'тыңдалды: 4/6'],
  ];
  for (const [ru, kk] of samples) assert.equal(vm.runInContext(`translateString(${JSON.stringify(ru)})`, ctx), kk, ru);
});


test('English dynamic feedback remains available when no inline fallback is supplied', () => {
  const { ctx } = translations();
  vm.runInContext("currentLang = 'en'", ctx);
  for (const [ru, en] of [
    ['Найдено 2 из 4, ложных 1', 'Found 2 of 4, false alarms 1'],
    ['Пар проверено: 5 из 6', 'Pairs tested: 5 of 6'],
    ['18.1 г — точно в рецепт', '18.1 g — right on the recipe'],
    ['31 с — переэкстракция, горько', '31 s — over-extracted, bitter'],
    ['Вы: 123/81. Верно: 125/80 мм рт. ст.', 'You: 123/81. Actual: 125/80 mmHg'],
    ['послушано 6/6', 'listened 6/6'],
  ]) assert.equal(vm.runInContext('translateString(' + JSON.stringify(ru) + ')', ctx), en, ru);
});

test('explicit game text can switch from English to Kazakh and back to Russian',()=>{
 const {ctx}=translations();vm.runInContext(readFileSync(new URL('../js/session.js',import.meta.url),'utf8'),ctx);
 vm.runInContext("currentLang='en';let dynamic=gameText('Новая цель','A new goal','Жаңа мақсат');currentLang='kk'",ctx);
 assert.equal(vm.runInContext('translateString(dynamic)',ctx),'Жаңа мақсат');vm.runInContext("currentLang='ru'",ctx);assert.equal(vm.runInContext("translateString('Жаңа мақсат')",ctx),'Новая цель');
});

test('mini-game helper keeps the Kazakh variant while initially rendering English',()=>{
 const {ctx}=translations();vm.runInContext(readFileSync(new URL('../js/session.js',import.meta.url),'utf8'),ctx);
 vm.runInContext(source.match(/^const T =.*$/m)[0],ctx);vm.runInContext("currentLang='en';T('Точность','Precision');currentLang='kk'",ctx);
 assert.equal(vm.runInContext("translateString('Precision')",ctx),'Дәлдік');
});
