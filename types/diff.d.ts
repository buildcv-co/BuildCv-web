// Minimal type declarations for the `diff` package (jsdiff v5).
// The package does not ship its own .d.ts file. We only type what we use.
// Reference: https://github.com/kpdecker/jsdiff (BSD-3-Clause)

declare module "diff" {
  export interface Change {
    value: string;
    count?: number;
    added?: boolean;
    removed?: boolean;
  }

  export function diffWords(oldStr: string, newStr: string): Change[];
  export function diffChars(oldStr: string, newStr: string): Change[];
  export function diffLines(oldStr: string, newStr: string): Change[];
  export function diffWordsWithSpace(oldStr: string, newStr: string): Change[];
}
