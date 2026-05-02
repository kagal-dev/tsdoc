/**
 * Standalone compatibility test — no test framework required.
 * Verifies the built dist loads on the current Node version
 * and key runtime exports resolve to the expected shapes.
 */

/* global console, process */
/* eslint unicorn/no-process-exit: "off" */

import {
  DEFAULT_OUTPUT_DIRECTORY,
  DuplicateExportPathError,
  DuplicateOutputFileError,
  newDocumentsHook,
  VERSION,
} from '../../dist/index.mjs';

let failures = 0;

function pass(name, detail) {
  console.log(`  ok ${name}${detail ? ' ' + detail : ''}`);
}

function fail(name, reason) {
  console.error(`  FAIL ${name}: ${reason}`);
  failures++;
}

function checkFunction(name, value) {
  if (typeof value === 'function') {
    pass(name);
  } else {
    fail(name, `expected function, got ${typeof value}`);
  }
}

function checkString(name, value, expected) {
  if (typeof value !== 'string') {
    fail(name, `expected string, got ${typeof value}`);
    return;
  }
  if (expected !== undefined && value !== expected) {
    fail(name, `expected '${expected}', got '${value}'`);
    return;
  }
  pass(name, `= '${value}'`);
}

function checkErrorClass(name, ErrorCtor) {
  if (typeof ErrorCtor !== 'function') {
    fail(name, `expected class, got ${typeof ErrorCtor}`);
    return;
  }
  try {
    const error = new ErrorCtor('a', 'b', 'c');
    if (!(error instanceof Error)) {
      fail(name, 'instance is not an Error');
      return;
    }
    if (error.name !== name) {
      fail(name, `error.name is '${error.name}', expected '${name}'`);
      return;
    }
    pass(name);
  } catch (error) {
    fail(name, `construction threw: ${error.message}`);
  }
}

console.log(`Node ${process.version}`);
console.log(`@kagal/build-tsdoc v${VERSION}`);

checkFunction('newDocumentsHook', newDocumentsHook);
checkString('VERSION', VERSION);
checkString('DEFAULT_OUTPUT_DIRECTORY', DEFAULT_OUTPUT_DIRECTORY, '_docs');
checkErrorClass('DuplicateExportPathError', DuplicateExportPathError);
checkErrorClass('DuplicateOutputFileError', DuplicateOutputFileError);

// Confirm the factory is callable end-to-end (catches any
// module-init regression that doesn't surface at import time).
checkFunction('newDocumentsHook()', newDocumentsHook());

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
} else {
  console.log(`\nok ${process.version} — all checks passed`);
}
