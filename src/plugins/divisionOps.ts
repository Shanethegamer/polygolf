import { getType } from "../common/getType";
import { Path, Visitor } from "../common/traverse";
import { polygolfOp } from "../IR";

export const modToRem: Visitor = {
  exit(path: Path) {
    const node = path.node;
    const program = path.root.node;
    if (node.type === "PolygolfOp" && node.op === "mod") {
      const rightType = getType(node.args[1], program);
      if (rightType.type !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify(rightType)}.`);
      if (rightType.low !== undefined && rightType.low >= 0n) {
        node.op = "rem";
      } else {
        path.replaceWith(
          polygolfOp(
            "rem",
            polygolfOp("add", polygolfOp("rem", ...node.args), node.args[1]),
            node.args[1]
          )
        );
      }
    }
  },
};

export const divToTruncdiv: Visitor = {
  exit(path: Path) {
    const node = path.node;
    const program = path.root.node;
    if (node.type === "PolygolfOp" && node.op === "div") {
      const rightType = getType(node.args[1], program);
      if (rightType.type !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify(rightType)}.`);
      if (rightType.low !== undefined && rightType.low >= 0n) {
        node.op = "trunc_div";
      } else {
        throw new Error("Not implemented.");
      }
    }
  },
};