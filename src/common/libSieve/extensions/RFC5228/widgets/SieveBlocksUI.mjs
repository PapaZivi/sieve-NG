/*
 * The contents of this file are licensed. You may obtain a copy of
 * the license at https://github.com/thsmi/sieve/ or request it via
 * email from the author.
 *
 * Do not remove or change this comment.
 *
 * The initial author of the code is:
 *   Thomas Schmid <schmid-thomas@gmx.net>
 *
 */

import { SieveDesigner } from "./../../../toolkit/SieveDesigner.mjs";

import {
  SieveAbstractBoxUI,
  SieveDropBoxUI
} from "./../../../toolkit/widgets/Boxes.mjs";

import { SieveBlockDropHandler } from "./../../../toolkit/events/DropHandler.mjs";


const FIRST_ELEMENT = 1;

/**
 * The UI Element which renders the root node.
 */
class SieveRootNodeUI extends SieveAbstractBoxUI {

  /**
   * @inheritdoc
   */
  createHtml(parent) {
    parent.append(
      this.getSieve().elms[FIRST_ELEMENT].html());

    return parent;
  }
}


/**
 * Provides an UI which realizes a block.
 * It is used tho host tests and actions.
 */
class SieveBlockUI extends SieveAbstractBoxUI {

  /**
   * Checks whether the element contains a rule-name marker.
   *
   * @param {SieveAbstractElement} elm
   *   the sieve element
   * @returns {boolean}
   *   true when this element is a rule name
   */
  isRuleName(elm) {
    if (elm.nodeName() !== "whitespace")
      return false;

    return elm.elements.some((item) => {
      return item.nodeName() === "comment/rulename";
    });
  }

  // TODO is this really needed to wrap the item?
  /**
   * Wraps the given child item in to a block.
   * @private
   *
   * @param {HTMLElement} item
   *   the item to be wrapped
   * @returns {HTMLElement}
   *   the ui element
   */
  createBlockChild(item) {
    const child = document.createElement('div');
    child.append(item);
    child.classList.add("sivBlockChild");

    return child;
  }

  /**
   * @inheritdoc
   */
  createHtml(parent) {
    const elm = document.createElement("div");
    elm.classList.add("sivBlock");

    const elements = this.getSieve().elms;
    for (let i = 0; i < elements.length; i++) {
      const sivElm = elements[i];
      const item = sivElm.html();

      if (!item)
        continue;

      elm.append((new SieveDropBoxUI(this, "sivBlockSpacer"))
        .drop(new SieveBlockDropHandler(), sivElm)
        .html());

      const condition = elements[i + 1];
      if (this.isRuleName(sivElm) && condition?.nodeName() === "condition") {
        const rule = document.createElement("div");
        rule.classList.add("sivRule");
        rule.append(item);
        rule.append(condition.html());

        elm.append(this.createBlockChild(rule));
        i++;
        continue;
      }

      elm.append(this.createBlockChild(item));
    }

    elm.append((new SieveDropBoxUI(this, "sivBlockSpacer"))
      .drop(new SieveBlockDropHandler())
      .html());

    parent.append(elm);
    return parent;
  }
}

SieveDesigner.register("block/body", SieveBlockUI);
SieveDesigner.register("block/rootnode", SieveRootNodeUI);

export { SieveBlockUI };
