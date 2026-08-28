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

import { SieveAbstractAccountUI } from "./SieveAbstractAccountUI.mjs";
import { SieveServerSettingsUI } from "./../settings/ui/SieveServerSettingsUI.mjs";
import { SieveTemplate } from "./../utils/SieveTemplate.mjs";


/**
 * A UI renderer for a sieve account
 */
class SieveMozAccountUI extends SieveAbstractAccountUI {
  /**
   * @inheritdoc
   */
  async isHidden() {
    return await this.send("account-is-hidden");
  }

  /**
   * Persists visibility without touching any server settings.
   *
   * @param {boolean} hidden
   *   true to use the compact hidden view
   */
  async setHidden(hidden) {
    await this.send("account-set-hidden", { hidden });
    await this.accounts.render();
  }

  /**
   * Renders a hidden account as a compact activation row.
   */
  async renderHidden() {
    document.querySelector(`#siv-account-${this.id}`)?.remove();

    const item = await (new SieveTemplate()).load("./accounts/account.hidden.html");
    item.id = `siv-account-${this.id}`;
    item.querySelector(".siv-account-name").textContent
      = await this.send("account-get-displayname");
    item.querySelector(".sieve-account-show")
      .addEventListener("click", () => { this.setHidden(false); });

    document.querySelector(".siv-accounts-items").append(item);
  }

  /**
   * @inheritdoc
   */
  async render() {
    if (await this.isHidden()) {
      await this.renderHidden();
      return;
    }

    const item = document.querySelector(`#siv-account-${this.id}`);
    if (item?.classList.contains("sieve-account-hidden"))
      item.remove();

    await super.render();
  }

  /**
   * @inheritdoc
   */
  async renderAccount() {
    await super.renderAccount();

    document.querySelector(`#siv-account-${this.id} .sieve-account-hide`)
      .addEventListener("click", () => { this.setHidden(true); });
  }


  /**
   * Adds the editable server settings action to the account details.
   */
  async renderSettings() {
    const settings = document.querySelector(
      `#siv-account-${this.id} .sieve-settings-content`);

    try {
      await super.renderSettings();

      const editServer = settings.querySelector(".sieve-account-edit-server");
      if (editServer)
        editServer.addEventListener("click", () => { this.showServerSettings(); });
    } catch (ex) {
      const message = ex?.message || String(ex);
      settings.replaceChildren();

      const alert = document.createElement("div");
      alert.className = "alert alert-danger m-3";
      alert.textContent = `Einstellungen konnten nicht geladen werden: ${message}`;
      settings.append(alert);

      console.error("Failed to render Sieve account settings", this.id, ex);
    }
  }

  /**
   * Shows and persists the server settings dialog.
   */
  async showServerSettings() {
    await (new SieveServerSettingsUI(this)).show();
    await this.renderSettings();

    document.querySelector(`#siv-account-${this.id} .siv-account-name`)
      .textContent = await this.send("account-get-displayname");
  }
}

export { SieveMozAccountUI as SieveAccountUI };
