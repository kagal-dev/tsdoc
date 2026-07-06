/**
 * Standalone compatibility smoke test — no test framework required.
 * Verifies the built dist loads on the current Node version and the
 * public exports resolve to the expected runtime shapes.
 */

/* global console, process */
/* eslint unicorn/no-process-exit: "off" */

import { VERSION } from '../../dist/index.mjs';

let failures = 0;

function pass(name, detail) {
  console.log(`  ok ${name}${detail ? ' ' + detail : ''}`);
}

function fail(name, reason) {
  console.error(`  FAIL ${name}: ${reason}`);
  failures++;
}

function checkString(name, value) {
  if (typeof value !== 'string') {
    fail(name, `expected string, got ${typeof value}`);
    return;
  }
  pass(name, `= '${value}'`);
}

console.log(`Node ${process.version}`);
console.log(`@kagal/model-tsdoc v${VERSION}`);

checkString('VERSION', VERSION);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
} else {
  console.log(`\nok ${process.version} — all checks passed`);
}
