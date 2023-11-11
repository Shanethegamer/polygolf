import emitProgram from "./emit";
import { mapToPrefixAndInfix } from "../../plugins/ops";
import { forRangeToWhile, whileToRecursion } from "../../plugins/loops";
import { lettersOnlyIdentGen, renameIdents } from "../../plugins/idents";
import { type Language, required } from "../../common/Language";
import {
  stuffToMacros,
  insertAccumulatedCounters,
  exprTreeToFlat2AC,
} from "./plugins";
import { texDetokenizer } from "./detokenizer";

const texLanguage: Language = {
  name: "TeX",
  extension: "tex",
  emitter: emitProgram,
  detokenizer: texDetokenizer,
  phases: [
    required(
      forRangeToWhile,
      whileToRecursion,
      exprTreeToFlat2AC,
      mapToPrefixAndInfix(
        {
          // TODO: I don't think neg works currently
          neg: "-",
          mul: "\\multiply",
          // TODO: check if TeX is trunc div or floor div.
          div: "\\divide",
          add: "\\advance",
          // TODO: sub works with \\advance-
        },
        true,
      ),
      stuffToMacros,
      insertAccumulatedCounters,
      renameIdents({
        preferred: (o) => lettersOnlyIdentGen.preferred(o).map((w) => "\\" + w),
        short: ["~"].concat(lettersOnlyIdentGen.short.map((c) => "\\" + c)),
        general: (i) => "\\" + lettersOnlyIdentGen.general(i),
      }),
    ),
  ],
};

export default texLanguage;