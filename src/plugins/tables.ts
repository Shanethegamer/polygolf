import { getType } from "../common/getType";
import { Plugin } from "../common/Language";
import {
  defaultValue,
  Expr,
  functionCall,
  int,
  IntegerLiteral,
  integerType,
  isIntLiteral,
  isPolygolfOp,
  isTextLiteral,
  listConstructor,
  polygolfOp,
  TextLiteral,
} from "../IR";

/**
 *
 * @param hashFunc Behaviour of the builtin hash function used.
 * @param hashNode Recipe for invoking the bultin hash function.
 * @param maxMod Max value of `mod`.
 * @returns Replaces `tableLiteral[key]` with `listLiteral[hash(key)%mod%len(listLiteral)]`,
 * where `hash` is the builtin used, `mod` <= `maxMod` and `listLiteral` contains values from `tableLiteral` and holes.
 */
export function tableHashing(
  hashFunc: (x: string) => number,
  hashNode: string | ((x: Expr) => Expr) = "hash",
  maxMod = 9999
): Plugin {
  let hash: (x: Expr) => Expr;
  if (typeof hashNode === "string") {
    hash = (x: Expr) => ({
      ...functionCall(hashNode, x),
      type: integerType(0, 2 ** 32 - 1),
    });
  } else {
    hash = hashNode;
  }
  return {
    name: "tableHashing(...)",
    visit(node, spine) {
      if (
        isPolygolfOp(node, "table_get") &&
        node.args[0].kind === "TableConstructor"
      ) {
        const table = node.args[0];
        const getKey = node.args[1];
        const tableType = getType(table, spine);
        if (
          tableType.kind === "Table" &&
          tableType.key.kind === "text" &&
          table.kvPairs.every((x) => isTextLiteral(x.key))
        ) {
          const searchResult = findHash(
            hashFunc,
            table.kvPairs.map((x) => [(x.key as TextLiteral).value, x.value]),
            maxMod
          );
          if (searchResult === null) return undefined;
          const [array, mod] = searchResult;
          let lastUsed = array.length - 1;
          while (array[lastUsed] === null) lastUsed--;

          return polygolfOp(
            "list_get",
            listConstructor(
              array
                .slice(0, lastUsed + 1)
                .map((x) => x ?? defaultValue(tableType.value))
            ),
            polygolfOp(
              "mod",
              mod === array.length
                ? hash(getKey)
                : polygolfOp("mod", hash(getKey), int(mod)),
              int(array.length)
            )
          );
        }
      }
    },
  };
}

function findHash( // TODO: Allow collisions in keys that map to the same value.
  hashFunc: (x: string) => number,
  table: [string, Expr][],
  maxMod: number
): [(Expr | null)[], number] | null {
  const hashedTable: [number, Expr][] = table.map((x) => [
    hashFunc(x[0]),
    x[1],
  ]);
  const result: (Expr | null)[] = Array(table.length);
  for (let width = table.length; width < table.length * 4; width++) {
    for (let mod = width; mod <= maxMod; mod++) {
      result.fill(null);
      let collision = false;
      for (const [key, value] of hashedTable) {
        const i = (key % mod) % width;
        if (result[i] !== null) {
          collision = true;
          break;
        }
        result[i] = value;
      }
      if (!collision) {
        return [result, mod];
      }
    }
    result.push(null);
  }
  return null;
}

// a simple hashFunc to test the plugin
function javaHash(str: string): number {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return (hash + 2 ** 32) % 2 ** 32;
}
export function testTableHashing(maxMod: number): Plugin {
  return {
    ...tableHashing(javaHash, "hash", maxMod),
    name: `testTableHashing(${maxMod})`,
  };
}

export const tableToListLookup: Plugin = {
  name: "tableToListLookup",
  visit(node) {
    if (
      isPolygolfOp(node, "table_get") &&
      node.args[0].kind === "TableConstructor"
    ) {
      const keys = node.args[0].kvPairs.map((x) => x.key);
      if (
        keys.every((x) => isTextLiteral(x) || isIntLiteral(x)) &&
        new Set(keys.map((x) => (x as IntegerLiteral | TextLiteral).value))
          .size === keys.length
      ) {
        const values = node.args[0].kvPairs.map((x) => x.value);
        const at = node.args[1];
        return polygolfOp(
          "list_get",
          listConstructor(values),
          polygolfOp("list_find", listConstructor(keys), at)
        );
      }
    }
  },
};