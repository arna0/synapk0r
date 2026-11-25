const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const reportPath = path.join(__dirname, '../frontend/js/report.js');
const scope = vm.createContext({});
vm.runInContext(fs.readFileSync(reportPath, 'utf8'), scope);

test('an error-free recipe cannot hide two poor decisions', () => {
  const outcome = scope.evaluateBaristaRun(0, 'A', 'low');
  assert.equal(outcome.procedure, 100);
  assert.equal(outcome.guest, 0);
  assert.equal(outcome.inventory, 0);
  assert.equal(outcome.score, 50);
});

test('component results are bounded and a perfect run earns 100', () => {
  assert.equal(scope.evaluateBaristaRun(0, 'B', 'optimal').score, 100);
  assert.equal(scope.evaluateBaristaRun(60, 'C', 'high').procedure, 0);
  assert.equal(scope.evaluateBaristaRun(60, 'C', 'high').score, 13);
});
