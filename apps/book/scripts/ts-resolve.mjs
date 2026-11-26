// Lets a script in scripts/ run the book's own TypeScript with Node's type stripping: the book imports its files
// without an extension (as Next and Vitest resolve them), so a relative import that names no file gets ".ts".
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.{1,2}\//.test(specifier) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try {
        return next(`${specifier}.ts`, context);
      } catch {
        // not a .ts file: resolve it as written
      }
    }
    return next(specifier, context);
  },
});
