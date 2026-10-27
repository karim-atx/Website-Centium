// Centium landing v29: the motion of the other marketing pages (Contact,
// Legal). The prototype runs one scroll loop on every page; off the landing
// all it moves is the chapter mark above the page title ("Contact",
// "Legal": the word rolls up out of its clip and the title rises from .15),
// so this chunk is the scroll engine with the chapter marks only. Code-split
// like the landing's motion; loaded by usePageMotion.

import { ScrollEngine } from "../engine/scrollEngine";
import { ChapterMarks } from "./chapters";

export function startPage(rm: boolean, low: boolean): ScrollEngine {
  const engine = new ScrollEngine({ rm, low });
  engine.add(new ChapterMarks(rm));
  engine.start();
  return engine;
}
