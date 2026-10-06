/*
 * The contents of this file are licensed. You may obtain a copy of
 * the license at https://github.com/thsmi/sieve/ or request it via
 * email from the author.
 *
 * Do not remove or change this comment.
 */

import { SieveDesigner } from "./../../../toolkit/SieveDesigner.mjs";

import {
  SieveAbstractBoxUI,
  SieveDialogBoxUI
} from "./../../../toolkit/widgets/Boxes.mjs";

import {
  SieveMoveDragHandler,
  SieveRuleMoveDragHandler
} from "./../../../toolkit/events/DragHandler.mjs";
import { SieveTemplate } from "./../../../toolkit/utils/SieveTemplate.mjs";
import { SieveI18n } from "./../../../toolkit/utils/SieveI18n.mjs";

/**
 * Renders a whitespace container only when it carries comments.
 */
class SieveWhiteSpaceUI extends SieveAbstractBoxUI {

  /**
   * Checks whether the whitespace contains visible comment metadata.
   *
   * @param {SieveAbstractElement} elm
   *   the whitespace element
   * @returns {boolean}
   *   true when at least one comment is present
   */
  static isVisible(elm) {
    return elm.elements.some((item) => {
      return item.nodeType() === "comment";
    });
  }

  /**
   * @inheritdoc
   */
  constructor(elm) {
    super(elm);

    const hasRuleName = elm.elements.some((item) => {
      return item.nodeName() === "comment/rulename";
    });

    this.drag(hasRuleName
      ? new SieveRuleMoveDragHandler("sieve/rulename")
      : new SieveMoveDragHandler("sieve/comment"));
  }

  /**
   * @inheritdoc
   */
  createHtml(parent) {
    parent.classList.add("sivCommentGroup");

    for (const item of this.getSieve().elements) {
      if (item.nodeType() !== "comment")
        continue;

      parent.append(item.html());
    }

    return parent;
  }
}

/**
 * Shared editor for Sieve comments.
 */
class SieveCommentUI extends SieveDialogBoxUI {

  /**
   * @inheritdoc
   */
  getTemplate() {
    return "./extensions/RFC5228/templates/SieveCommentUI.html";
  }

  /**
   * @inheritdoc
   */
  onLoad() {
    document.querySelector("#sivCommentText").value = this.getSieve().value();
  }

  /**
   * @inheritdoc
   */
  onSave() {
    const input = document.querySelector("#sivCommentText");
    if (!input.checkValidity())
      return false;

    this.getSieve().value(input.value);
    return true;
  }

  /**
   * @inheritdoc
   */
  getSummary() {
    const summary = (new SieveTemplate()).convert(
      `<div><span data-i18n="comment.summary"></span> <em></em></div>`);

    summary.querySelector("em").textContent = this.getSieve().value().trim();
    return summary;
  }

  /**
   * @inheritdoc
   */
  createHtml(parent) {
    const elm = super.createHtml(parent);
    elm.classList.add("sivComment");
    return elm;
  }
}

/**
 * Editor for the # rule:[name] convention.
 */
class SieveRuleNameUI extends SieveDialogBoxUI {

  /**
   * @inheritdoc
   */
  getTemplate() {
    return "./extensions/RFC5228/templates/SieveRuleNameUI.html";
  }

  /**
   * @inheritdoc
   */
  onLoad() {
    document.querySelector("#sivRuleName").value = this.getSieve().value();
  }

  /**
   * @inheritdoc
   */
  onSave() {
    const input = document.querySelector("#sivRuleName");
    if (!input.value.trim() || input.value.includes("]"))
      return false;

    this.getSieve().value(input.value);
    return true;
  }

  /**
   * @inheritdoc
   */
  getSummary() {
    const summary = document.createElement("div");
    summary.textContent = this.getSieve().value();
    return summary;
  }

  /**
   * @inheritdoc
   */
  createHtml(parent) {
    const elm = super.createHtml(parent);
    elm.classList.add("sivRuleName");
    elm.title = SieveI18n.getInstance().getString("rulename.summary");
    return elm;
  }
}

SieveDesigner.register("whitespace", SieveWhiteSpaceUI);
SieveDesigner.register("comment/hashcomment", SieveCommentUI);
SieveDesigner.register("comment/bracketcomment", SieveCommentUI);
SieveDesigner.register("comment/rulename", SieveRuleNameUI);

export { SieveWhiteSpaceUI, SieveCommentUI, SieveRuleNameUI };
