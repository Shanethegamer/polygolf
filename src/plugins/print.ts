import { replaceAtIndex } from "../common/immutable";
import { GolfPlugin } from "../common/Language";
import { Spine } from "../common/Spine";
import { polygolfOp, stringLiteral } from "../IR";
import { mapOps } from "./ops";

export const printLnToprint = mapOps([
  [
    "println",
    (x) =>
      polygolfOp("print", polygolfOp("text_concat", x[0], stringLiteral("\n"))),
  ],
]);

/**
 * Since code.golf strips output whitespace, for the last print,
 * it doesn't matter if print or println is used, so the shorter one should be used.
 */
export function golfLastPrint(toPrintln = true): GolfPlugin {
  return {
    tag: "golf",
    name: "golfLastPrint",
    visit(spine: Spine) {
      const program = spine.node;
      if (program.kind !== "Program") return;
      const newOp = toPrintln ? ("println" as const) : ("print" as const);
      const oldOp = toPrintln ? "print" : "println";
      if (program.body.kind === "PolygolfOp" && program.body.op === oldOp) {
        return { ...program, body: { ...program.body, op: newOp } };
      } else if (program.body.kind === "Block") {
        const oldChildren = program.body.children;
        const lastStatement = oldChildren[oldChildren.length - 1];
        if (lastStatement.kind === "PolygolfOp" && lastStatement.op === oldOp) {
          const newLastStatement = { ...lastStatement, op: newOp };
          const children = replaceAtIndex(
            oldChildren,
            oldChildren.length - 1,
            newLastStatement
          );
          return { ...program, body: { ...program.body, children } };
        }
      }
    },
  };
}
