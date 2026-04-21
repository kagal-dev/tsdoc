/** A sample constant for testing. */
export const SAMPLE = 'hello';

/**
 * A sample internal helper.
 *
 * @internal
 */
export function internalHelper(): number {
  return 42;
}

/** A sample interface for testing. */
export interface SampleOptions {
  /** Whether to enable verbose output. */
  verbose?: boolean
}

/**
 * A sample function for testing.
 *
 * @param name - the name to greet
 * @returns a greeting string
 */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

/**
 * A sample class for testing.
 *
 * Exercises tsdoc-markdown's constructor, method,
 * and property extraction paths.
 */
export class Greeter {
  /** The greeting prefix. */
  readonly prefix: string;

  /**
   * Create a new Greeter.
   *
   * @param prefix - the greeting prefix
   */
  constructor(prefix: string) {
    this.prefix = prefix;
  }

  /**
   * Greet someone by name.
   *
   * @param name - the name to greet
   * @returns a greeting string
   */
  greet(name: string): string {
    return `${this.prefix}, ${name}!`;
  }
}
