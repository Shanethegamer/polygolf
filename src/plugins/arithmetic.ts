import { Plugin } from "../common/Language";
import { int, leq, polygolfOp, IntegerType, isConstantType } from "../IR";
import { getType } from "../common/getType";

export const modToRem: Plugin = {
  name: "modToRem",
  visit(node, spine) {
    if (node.kind === "PolygolfOp" && node.op === "mod") {
      const rightType = getType(node.args[1], spine);
      if (rightType.kind !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify(rightType)}.`);
      if (leq(0n, rightType.low)) {
        return polygolfOp("rem", ...node.args);
      } else {
        return polygolfOp(
          "rem",
          polygolfOp("add", polygolfOp("rem", ...node.args), node.args[1]),
          node.args[1]
        );
      }
    }
  },
};

export const divToTruncdiv: Plugin = {
  name: "divToTruncdiv",
  visit(node, spine) {
    if (node.kind === "PolygolfOp" && node.op === "div") {
      const rightType = getType(node.args[1], spine);
      if (rightType.kind !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify(rightType)}.`);
      if (leq(0n, rightType.low)) {
        return {
          ...node,
          op: "trunc_div",
        };
      } else {
        return undefined; // TODO
      }
    }
  },
};

export const truncatingOpsPlugins = [modToRem, divToTruncdiv];

export const equalityToInequality: Plugin = {
  name: "equalityToInequality",
  visit(node, spine) {
    if (node.kind === "PolygolfOp" && (node.op === "eq" || node.op === "neq")) {
      const eq = node.op === "eq";
      const [a, b] = [node.args[0], node.args[1]];
      const [t1, t2] = [a, b].map((x) => getType(x, spine)) as [
        IntegerType,
        IntegerType
      ];
      if (isConstantType(t1)) {
        if (t1.low === t2.low) {
          // (0 == $x:0..9) -> (1 > $x:0..9)
          // (0 != $x:0..9) -> (0 < $x:0..9)
          return eq
            ? polygolfOp("gt", int(t1.low + 1n), b)
            : polygolfOp("lt", int(t1.low), b);
        }
        if (t1.low === t2.high) {
          // (9 == $x:0..9) -> (8 < $x:0..9)
          // (9 != $x:0..9) -> (9 > $x:0..9)
          return eq
            ? polygolfOp("lt", int(t1.low - 1n), b)
            : polygolfOp("gt", int(t1.low), b);
        }
      }

      if (isConstantType(t2)) {
        if (t1.low === t2.low) {
          // ($x:0..9 == 0) -> ($x:0..9 < 1)
          // ($x:0..9 != 0) -> ($x:0..9 > 0)
          return eq
            ? polygolfOp("lt", a, int(t2.low + 1n))
            : polygolfOp("gt", a, int(t2.low));
        }
        if (t1.high === t2.low) {
          // ($x:0..9 == 9) -> ($x:0..9 > 8)
          // ($x:0..9 != 9) -> ($x:0..9 < 9)
          return eq
            ? polygolfOp("gt", a, int(t2.low - 1n))
            : polygolfOp("lt", a, int(t2.low));
        }
      }
    }
  },
};