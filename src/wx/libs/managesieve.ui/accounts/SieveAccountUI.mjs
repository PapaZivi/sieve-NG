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


/**
 * A UI renderer for a sieve account
 */
class SieveMozAccountUI extends SieveAbstractAccountUI {

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
