// Registers the resolver in test-resolve-hooks.mjs. Node needs the
// registration to happen in its own module, loaded with --import before the
// test files are resolved.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./test-resolve-hooks.mjs", pathToFileURL(import.meta.filename));
