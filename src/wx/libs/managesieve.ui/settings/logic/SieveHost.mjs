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

/* global browser */

import { SieveCustomHost } from "./SieveAbstractHost.mjs";

const CONFIG_KEEP_ALIVE_INTERVAL = "keepalive";
const CONFIG_HOSTNAME = "hostname";
const CONFIG_DISPLAY_NAME = "host.displayName";
const CONFIG_FINGERPRINT = "host.fingerprint";
// eslint-disable-next-line no-magic-numbers
const ONE_MINUTE = 60 * 1000;
// eslint-disable-next-line no-magic-numbers
const FIVE_MINUTES = 5 * ONE_MINUTE;

/**
 * This class loads the hostname from an IMAP account. The hostname is not
 * cached it. This ensures that always the most recent settings are used.
 */
class SieveMozHost extends SieveCustomHost {

  /**
   * @inheritdoc
   */
  async getDisplayName() {
    const fallback = await browser.sieve.accounts.getPrettyName(this.account.getId());
    return await this.account.getConfig().getString(CONFIG_DISPLAY_NAME, fallback);
  }

  /**
   * @inheritdoc
   */
  async setDisplayName(value) {
    await this.account.getConfig().setString(CONFIG_DISPLAY_NAME, value);
    return this;
  }

  /**
   * @inheritdoc
   */
  async getHostname() {
    const configured = await this.account.getConfig().getValue(CONFIG_HOSTNAME);

    if (configured && configured !== "undefined" && configured !== "null")
      return `${configured}`;

    return await browser.sieve.accounts.getHostname(this.account.getId()) || "";
  }

  /**
   * @inheritdoc
   */
  async setHostname(value) {
    value = String(value || "").trim();

    if (!value || value === "undefined" || value === "null")
      throw new Error("A valid server hostname is required");

    await this.account.getConfig().setString(CONFIG_HOSTNAME, value);
    return this;
  }

  /**
   * @inheritdoc
   */
  async getKeepAlive() {
    return await this.account.getConfig().getInteger(CONFIG_KEEP_ALIVE_INTERVAL, FIVE_MINUTES);
  }

  /**
   * @inheritdoc
   */
  async setKeepAlive(value) {
    await this.account.getConfig().setInteger(CONFIG_KEEP_ALIVE_INTERVAL, value);
    return this;
  }

  /**
   * @inheritdoc
   */
  async getFingerprint() {
    return await this.account.getConfig().getString(CONFIG_FINGERPRINT, "");
  }

  /**
   * @inheritdoc
   */
  async setFingerprint(value) {
    await this.account.getConfig().setString(CONFIG_FINGERPRINT, value);
    return this;
  }
}

export { SieveMozHost as SieveHost };
