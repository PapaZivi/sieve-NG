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

import { SieveDataTransfer } from "./DataTransfer.mjs";

/**
 * Implements a abstract drag handler.
 */
class SieveAbstractDragHandler {

  /**
   * Creates a new instance.
   *
   * @param {string} [flavour]
   *   the drag handler's flavour, if omitted "sieve/action" is used.
   */
  constructor(flavour) {
    if (typeof (flavour) !== "undefined")
      this._flavour = flavour;
    else
      this._flavour = "sieve/action";
  }

  /**
   * Gets and sets the drag flavour.
   *
   * @param {string} [flavour]
   *   the new drag flavour.
   *
   * @returns {string}
   *   the current drag flavour.
   */
  flavour(flavour) {
    if ((typeof (flavour) !== 'undefined') && (flavour !== null))
      this._flavour = flavour;

    return this._flavour;
  }

  /**
   * Called when a drag operation starts.
   *
   * @param {Event} event
   *   the DOM Event which fired.
   * @returns {boolean}
   *   true in case the drag operation can start otherwise false.
   */
  onDragStart(event) {

    if (!this.onDrag)
      return false;

    this.onDrag(event);

    const elm = this.getDragImage();

    const rect = elm.getBoundingClientRect();

    event.dataTransfer.setDragImage(elm,
      Math.round(event.clientX - rect.x),
      Math.round(event.clientY - rect.y));

    // event.preventDefault();
    event.stopPropagation();

    return true;
  }

  /**
   * Gets the element used as drag image.
   *
   * @returns {HTMLElement}
   *   the drag image element
   */
  getDragImage() {
    return this.owner().html();
  }

  /**
   * A short hand to get the sieve document for this drag handler.
   * It queries the owner document to get a reference to the document.
   * In case the owner is not set an exception is thrown.
   *
   * @returns {SieveDocument}
   *  the document which is associated to this document
   */
  document() {
    if (!this._owner)
      throw new Error("Owner for this Drop Handler");

    return this._owner.document();
  }

  /**
   * Sets the sieve element which is associated with this owner.
   *
   * @param {SieveAbstractElement} owner
   *   the owner which should be bound to this drag handler.
   */
  bind(owner) {
    this._owner = owner;
  }

  /**
   * @returns {SieveAbstractElement}
   */
  owner() {
    return this._owner;
  }

  /**
   * Binds drag event handlers to the html element and marks it at draggable
   *
   * @param {HTMLElement} html
   *   the html element
   */
  attach(html) {
    html.dataset.sieveFlavour = this.flavour();
    html.draggable = true;

    html.addEventListener("dragstart", (e) => { this.onDragStart(e); return true; });
    html.addEventListener("dragend", () => { return false; });
  }

  /**
   * Fired whe n an element is being dragged.
   *
   * @param {Event} event
   *   the dom event which was fired.
   */
  onDrag(event) {
    const dt = new SieveDataTransfer(event.dataTransfer);

    dt.clear();

    dt.setData("application/sieve", this.getScript());
    dt.setData(this.flavour(), this.getMetaInfo());
  }

  /**
   * The Sieve script which should be transferred.
   * @abstract
   *
   * @returns {string} the sieve script as plain text
   */
  getScript() {
    throw new Error("Implement me");
  }

  /**
   * The meta information for this sieve script.
   * @abstract
   *
   * @returns {string} the meta information about the drag element
   */
  getMetaInfo() {
    throw new Error("Implement me");
  }
}


/**
 *
 */
class SieveMoveDragHandler extends SieveAbstractDragHandler {

  /**
   * @inheritdoc
   */
  getScript() {
    return "" + this.owner().getSieve().toScript();
  }

  /**
   * @inheritdoc
   */
  getMetaInfo() {
    return JSON.stringify({ id: this.owner().id(), action: "move" });
  }
}

/**
 * Moves an element which may be displayed as part of a complete rule.
 */
class SieveRuleMoveDragHandler extends SieveMoveDragHandler {

  /**
   * Gets the rule-name and condition pair associated with the dragged item.
   *
   * @returns {SieveAbstractElement[]}
   *   the complete rule or the dragged element by itself
   */
  getRuleElements() {
    const source = this.owner().getSieve();
    const parent = source.parent();

    if (!parent?.children)
      return [source];

    const elements = parent.children();
    const index = elements.indexOf(source);

    const isRuleName = (item) => {
      return item?.nodeName() === "whitespace" && item.elements.some((elm) => {
        return elm.nodeName() === "comment/rulename";
      });
    };

    if (source.nodeName() === "condition" && isRuleName(elements[index - 1]))
      return [elements[index - 1], source];

    if (isRuleName(source) && elements[index + 1]?.nodeName() === "condition")
      return [source, elements[index + 1]];

    return [source];
  }

  /**
   * @inheritdoc
   */
  getScript() {
    return this.getRuleElements().map((item) => {
      return item.toScript();
    }).join("");
  }

  /**
   * @inheritdoc
   */
  getDragImage() {
    return this.owner().html().closest(".sivRule") || super.getDragImage();
  }
}

/**
 *
 */
class SieveCreateDragHandler extends SieveAbstractDragHandler {

  /**
   * @inheritdoc
   */
  getScript() {
    return "" + this.owner().toScript();
  }

  /**
   * @inheritdoc
   */
  getMetaInfo() {
    return JSON.stringify({ type: this.owner()._elmType, action: "create" });
  }
}

export {
  SieveMoveDragHandler,
  SieveRuleMoveDragHandler,
  SieveCreateDragHandler
};
