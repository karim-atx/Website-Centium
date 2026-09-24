// Lets `node --test` resolve the imports this codebase actually writes.
//
// Vite resolves `./prescription` to `./prescription.ts`; Node's ESM resolver
// does not, and requires the extension on every relative specifier. Without
// this, a module is only unit-testable if it imports nothing of its own — the
// first version of the workout services worked around that by shuffling
// constants between files to avoid a cross-import, which is the tail wagging
// the dog.
//
// The hook changes nothing about what ships: Vite still does the resolving for
// the bundle, and this file is loaded only by `npm test`.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    // Only rescue a relative import with no extension — anything else is a
    // genuine missing module and should still fail loudly.
    if (!specifier.startsWith(".") || /\.[cm]?[jt]sx?$/.test(specifier)) throw error;
    for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
      try {
        return await nextResolve(candidate, context);
      } catch {
        // Try the next shape.
      }
    }
    throw error;
  }
}
