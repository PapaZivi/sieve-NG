/*
 * The content of this file is licensed. You may obtain a copy of
 * the license at https://github.com/thsmi/sieve/ or request it via
 * email from the author.
 *
 * Do not remove or change this comment.
 *
 * The initial author of the code is:
 *   Thomas Schmid <schmid-thomas@gmx.net>
 */

import { SieveAccountUI } from "./SieveAccountUI.mjs";
import { SieveIpcClient } from "./../utils/SieveIpcClient.mjs";
import { SieveLogger } from "./../utils/SieveLogger.mjs";

/**
 * A UI renderer for a list of sieve accounts
 **/
class SieveAbstractAccounts {

  /**
   * Gets an instance to the logger.
   *
   * @returns {SieveLogger}
   *   an reference to the logger instance.
   **/
  getLogger() {
    return SieveLogger.getInstance();
  }

  /**
   * Renders the UI for this component.
   *
   * @param {string} [account]
   *   the optional account id which should be rendered. If omitted all
   *   account will be updated.
   */
  async render(account) {

    if ((typeof(account) !== "undefined") && (account !== null)) {
      this.getLogger().logWidget(` + Rendering Accounts ${account}`);
      await ((new SieveAccountUI(this, account)).render());
      return;
    }

    this.getLogger().logWidget("Rendering Accounts...");

    const items = document.querySelector(".siv-accounts-items");
    while (items.firstChild)
      items.firstChild.remove();

    const accounts = await SieveIpcClient.sendMessage("core", "accounts-list");
    const visible = [];
    const hidden = [];

    for (const id of accounts) {
      const item = new SieveAccountUI(this, id);
      if (await item.isHidden())
        hidden.push(item);
      else
        visible.push(item);
    }

    for (const item of [...visible, ...hidden])
      await item.render();
  }
}

export { SieveAbstractAccounts };
