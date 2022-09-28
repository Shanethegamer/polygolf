import { IR } from "IR";
import { PathFragment } from "./traverse";

export function needsParensPrecedence(
  expr: IR.Expr,
  parent: IR.Node,
  fragment?: PathFragment
): boolean {
  if (parent.type === "UnaryOp") {
    return expr.type === "BinaryOp" && expr.precedence <= parent.precedence;
  } else if (parent.type === "BinaryOp" && expr.type === "BinaryOp") {
    if (fragment === undefined) return true;
    if (fragment === "right") {
      if (expr.rightAssociative) return expr.precedence < parent.precedence;
      return expr.precedence <= parent.precedence;
    }
    if (expr.rightAssociative) return expr.precedence <= parent.precedence;
    return expr.precedence < parent.precedence;
  }
  if (parent.type === "MethodCall" && fragment === "object") {
    return expr.type === "UnaryOp" || expr.type === "BinaryOp";
  }
  return false;
}

export function joinGroups(groups: string[][], ...sep: string[]): string[] {
  return groups.flatMap((x, i) => (i > 0 ? [...sep, ...x] : x));
}

/**
 * Chooses the shortest option to represent the given string as a string literal.
 * Each option is described by the string delimiters (string or two strings) and an array of substitutions.
 * Substitution of the form `[somechar, null]` indicates that `somechar` cannot be present in the string in this option.
 */
export function emitStringLiteral(
  value: string,
  options: [string | [string, string], [string, string | null][]][] = [
    [
      `"`,
      [
        [`\\`, `\\\\`],
        [`\n`, `\\n`],
        [`\r`, `\\r`],
        [`"`, `\\"`],
      ],
    ],
  ]
) {
  let result = "";
  for (const [delim, escapes] of options) {
    if (escapes.some((x) => x[1] === null && value.includes(x[0]))) continue;
    let current = value;
    for (const [c, d] of escapes) {
      if (d === null) continue;
      current = current.replace(c, d);
    }
    if (typeof delim === "string") current = delim + current + delim;
    else current = delim[0] + current + delim[1];
    if (result === "" || current.length < result.length) result = current;
  }
  return [result];
}

export function hasChildWithBlock(node: IR.Node): boolean {
  for (const child of getChildren(node)) {
    if ("consequent" in child || "children" in child || "body" in child) {
      return true;
    }
  }
  return false;
}

function getChildren(node: IR.Node): IR.Node[] {
  const result = [];
  for (const key in node) {
    const value = node[key as keyof typeof node] as any as IR.Node[] | IR.Node;
    if (Array.isArray(value)) {
      result.push(...value);
    } else if (typeof value?.type === "string") {
      result.push(value);
    }
  }
  return result;
}
