import {
  EmitError,
  emitIntLiteral,
  emitTextFactory,
  getIfChain,
} from "../../common/emit";
import { isInt, type IR, isForEachRange, type Node } from "../../IR";
import { type TokenTree } from "../../common/Language";

const emitJanetText = emitTextFactory({
  '"TEXT"': { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, '"': `\\"` },
  "`\nTEXT\n`": { cantMatch: /`/ },
  "``\nTEXT\n``": { cantMatch: /``/ },
  "`TEXT`": { cantMatch: /|^$|^\n|\n$/ },
});

export default function emitProgram(program: IR.Node): TokenTree {
  function list(name: string, ...args: (TokenTree | Node)[]) {
    return [
      "(",
      name,
      ...args.map((x) => (typeof x === "object" && "kind" in x ? emit(x) : x)),
      ")",
    ];
  }

  function multiNode(BaseNode: IR.Node, blockNeedsDo = false): TokenTree {
    const children = BaseNode.kind === "Block" ? BaseNode.children : [BaseNode];
    if (BaseNode.kind === "Block" && blockNeedsDo) {
      return list("do", ...children);
    }
    return children.map((x) => emit(x));
  }

  /**
   * Emits the expression.
   * @param expr The expression to be emited.
   * @returns  Token tree corresponding to the expression.
   */
  function emit(e: IR.Node): TokenTree {
    switch (e.kind) {
      case "Block":
        return multiNode(e);
      case "While":
        return list("while", e.condition, multiNode(e.body));
      case "ForEach":
        if (isForEachRange(e)) {
          const [low, high, step] = e.collection.args;
          return isInt(1n)(step)
            ? list("for", e.variable ?? "_", low, high, multiNode(e.body))
            : list(
                "loop",
                "[",
                e.variable ?? "_",
                ":range",
                "[",
                low,
                high,
                step,
                "]",
                "]",
                multiNode(e.body),
              );
        }
        return list("each", e.variable ?? "_", e.collection, multiNode(e.body));
      case "If": {
        const { ifs, alternate } = getIfChain(e);
        return list(
          ifs.length > 1 ? "cond" : "if",
          ifs.map((x) => [emit(x.condition), multiNode(x.consequent, true)]),
          alternate === undefined ? [] : multiNode(alternate, true),
        );
      }
      case "VarDeclarationWithAssignment": {
        const assignment = e.assignment;
        if (assignment.kind !== "Assignment") {
          throw new EmitError(
            e,
            `Declaration cannot contain ${assignment.kind}`,
          );
        }
        return list("var", assignment.variable, assignment.expr);
      }
      case "Assignment":
        return list("set", e.variable, e.expr);
      case "Identifier":
        return e.name;
      case "Text":
        return emitJanetText(e.value);
      case "Integer":
        return emitIntLiteral(e, {
          10: ["", ""],
          16: ["0x", ""],
          36: ["36r", ""],
        });
      case "FunctionCall":
        return list(emit(e.func) as any, ...e.args);
      case "RangeIndexCall":
        if (!isInt(1n)(e.step)) throw new EmitError(e, "step not equal one");
        return isInt(0n)(e.low)
          ? list("take", emit(e.high), emit(e.collection))
          : list("slice", emit(e.collection), emit(e.low), emit(e.high));
      case "ConditionalOp": {
        const { ifs, alternate } = getIfChain(e);
        return list(
          ifs.length > 1 ? "cond" : "if",
          ifs.map((x) => [emit(x.condition), emit(x.consequent)]),
          emit(alternate!),
        );
      }
      case "List":
        return ["@[", e.value.map((x) => emit(x)), "]"];
      case "Table":
        return ["@{", e.value.map((x) => [emit(x.key), emit(x.value)]), "}"];
      default:
        throw new EmitError(e);
    }
  }

  return multiNode(program);
}
