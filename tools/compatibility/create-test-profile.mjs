/*
 * Creates an isolated Thunderbird profile for the compatibility smoke test.
 * The profile is disposable and must never be used with a real mail account.
 */

import fs from "node:fs/promises";
import path from "node:path";

const [, , profileArgument, xpiArgument] = process.argv;

if (!profileArgument || !xpiArgument) {
  throw new Error("Usage: node create-test-profile.mjs <profile-directory> <xpi>");
}

const profileDirectory = path.resolve(profileArgument);
const xpi = path.resolve(xpiArgument);
const extensionId = "sieve-ng@hightext.de";
const allExtensionScopes = 15;
const imapPort = 143;
const marionettePort = 2828;

await fs.access(xpi);
await fs.mkdir(path.join(profileDirectory, "extensions"), { recursive: true });
await fs.mkdir(path.join(profileDirectory, "ImapMail", "localhost"), { recursive: true });
await fs.copyFile(xpi, path.join(profileDirectory, "extensions", `${extensionId}.xpi`));

const preferences = {
  "app.normandy.api_url": "",
  "app.shield.optoutstudies.enabled": false,
  "app.update.auto": false,
  "browser.shell.checkDefaultBrowser": false,
  "datareporting.healthreport.uploadEnabled": false,
  "datareporting.policy.dataSubmissionEnabled": false,
  "extensions.autoDisableScopes": 0,
  "extensions.enabledScopes": allExtensionScopes,
  "mail.account.account1.identities": "",
  "mail.account.account1.server": "server1",
  "mail.accountmanager.accounts": "account1",
  "mail.accountmanager.defaultaccount": "account1",
  "mail.biff.show_alert": false,
  "mail.provider.suppress_dialog_on_startup": true,
  "mail.server.server1.check_new_mail": false,
  "mail.server.server1.directory-rel": "[ProfD]ImapMail/localhost",
  "mail.server.server1.hostname": "localhost",
  "mail.server.server1.login_at_startup": false,
  "mail.server.server1.name": "Sieve compatibility test",
  "mail.server.server1.port": imapPort,
  "mail.server.server1.socketType": 0,
  "mail.server.server1.type": "imap",
  "mail.server.server1.userName": "user",
  "mail.shell.checkDefaultClient": false,
  "mail.spotlight.firstRunDone": true,
  "mail.winsearch.firstRunDone": true,
  "mailnews.database.global.indexer.enabled": false,
  "mailnews.start_page.override_url": "about:blank",
  "mailnews.start_page.url": "about:blank",
  "marionette.enabled": true,
  "marionette.port": marionettePort,
  "toolkit.telemetry.enabled": false
};

const serialize = (value) => {
  return JSON.stringify(value);
};
const userJs = Object.entries(preferences)
  .map(([name, value]) => {
    return `user_pref(${serialize(name)}, ${serialize(value)});`;
  })
  .join("\n");

await fs.writeFile(path.join(profileDirectory, "user.js"), `${userJs}\n`);
