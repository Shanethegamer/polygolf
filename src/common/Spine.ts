import { IR } from "../IR";
import { getChild, getChildFragments, PathFragment } from "./fragments";
import { replaceAtIndex } from "./immutable";

/** A Spine is like a Path but immutable. It assumes
 * that no mutation is performed on itself or its members. */
export class Spine<N extends IR.Node = IR.Node> {
  public readonly root: Spine<IR.Program>;

  constructor(
    public readonly node: N,
    public readonly parent: Spine | null,
    public readonly pathFragment: PathFragment | null
  ) {
    const root = parent?.root ?? parent ?? this;
    if (root.node.kind !== "Program")
      throw new Error(
        `Programming error: Root node should be a Program, but got ${root.node.kind}`
      );
    this.root = root as Spine<IR.Program>;
  }

  getChildSpines(): Spine[] {
    return Array.from(getChildFragments(this.node)).map((n) =>
      this.getChild(n)
    );
  }

  getChild(pathFragment: PathFragment): Spine {
    return new Spine(getChild(this.node, pathFragment), this, pathFragment);
  }

  withChildReplaced(newChild: IR.Node, pathFragment: PathFragment): Spine<N> {
    const node =
      typeof pathFragment === "string"
        ? { ...this.node, [pathFragment]: newChild }
        : {
            ...this.node,
            [pathFragment.prop]: replaceAtIndex(
              (this.node as any)[pathFragment.prop],
              pathFragment.index,
              newChild
            ),
          };
    return new Spine(
      node,
      this.parent === null || this.pathFragment === null
        ? null
        : this.parent.withChildReplaced(node, this.pathFragment),
      this.pathFragment
    );
  }

  replacedWith(newNode: IR.Node): Spine {
    if (this.parent === null || this.pathFragment === null) {
      if (newNode.kind !== "Program")
        throw new Error(
          `Programming error: attempt to replace the root node ` +
            `with node of kind ${newNode.kind}`
        );
      // replace the root node
      return new Spine(newNode, null, null);
    }
    return this.parent
      .withChildReplaced(newNode, this.pathFragment)
      .getChild(this.pathFragment);
  }

  *visit<T>(
    visitor: (spine: Spine) => T | undefined
  ): Generator<T, void, undefined> {
    const ret = visitor(this);
    if (ret !== undefined) yield ret;
    for (const child of this.getChildSpines()) yield* child.visit(visitor);
  }

  everyNode(visitor: (spine: Spine) => boolean) {
    for (const val of this.visit(visitor)) if (!val) return false;
    return true;
  }

  someNode(visitor: (spine: Spine) => boolean) {
    for (const val of this.visit(visitor)) if (val) return true;
    return false;
  }

  withReplacer(
    replacer: (spine: Spine) => IR.Node | undefined,
    skipThis?: boolean
  ): Spine {
    const ret = skipThis === true ? undefined : replacer(this);
    if (ret === undefined) {
      // recurse on children
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      let curr = this as Spine;
      for (const child of this.getChildSpines()) {
        const newChild = child.withReplacer(replacer);
        if (newChild !== child) {
          curr = curr.withChildReplaced(newChild.node, child.pathFragment!);
          // Following line should be equivalent but doesn't work: (Bug?)
          //    curr = child.replacedWith(newChild.node).parent!;
        }
      }
      return curr;
    } else {
      // replace this, then recurse on children but not this
      return this.replacedWith(ret).withReplacer(replacer, true);
    }
  }
}

export function programToSpine(node: IR.Program) {
  return new Spine(node, null, null);
}