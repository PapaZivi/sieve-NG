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

(function (exports) {

  /* global ExtensionCommon */
  /* global Components */

  const Cc = Components.classes;
  const Ci = Components.interfaces;

  const MESSAGE_URI_PREFIX_LENGTH = 15;
  const HOST_TYPE_CUSTOM = 1;
  const PORT_TYPE_LEGACY = 1;
  const PORT_TYPE_CUSTOM = 2;
  const PORT_SIEVE_RFC = 4190;
  const PORT_SIEVE_LEGACY = 2000;

  /**
   * Get the incoming server for the given account id.
   *
   * @param {string} account
   *   the account id
   * @returns {Components.interfaces.nsIMsgAccountManager}
   *   a reference to the incoming server.
   */
  function getIncomingServer(account) {
    return Cc['@mozilla.org/messenger/account-manager;1']
      .getService(Ci.nsIMsgAccountManager)
      .getAccount(account)
      .incomingServer;
  }

  /**
   * Reads a custom server stored by the legacy Sieve add-on.
   *
   * @param {string} id
   *   the Thunderbird account id.
   * @returns {object}
   *   legacy hostname and port, or an empty object.
   */
  function getLegacyServer(id) {
    try {
      const server = getIncomingServer(id);
      const messageUri = server.rootMsgFolder?.baseMessageURI
        || server.rootFolder?.baseMessageURI
        || "";
      const serverUri = server.serverURI || "";
      const uri = messageUri
        ? messageUri.slice(MESSAGE_URI_PREFIX_LENGTH)
        : serverUri.replace(/^[^:]+:\/\//u, "");

      if (!uri)
        return {};

      const prefix = `extensions.sieve.account.${uri}.`;
      const prefs = Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefBranch);

      if (!prefs.prefHasUserValue(prefix + "activeHost")
          || prefs.getIntPref(prefix + "activeHost") !== HOST_TYPE_CUSTOM)
        return {};

      let hostname = "";
      if (prefs.prefHasUserValue(prefix + "hostname")) {
        try {
          hostname = prefs.getStringPref(prefix + "hostname");
        } catch {
          hostname = prefs.getCharPref(prefix + "hostname", "");
        }
      }

      let port = PORT_SIEVE_RFC;
      const portType = prefs.prefHasUserValue(prefix + "port.type")
        ? prefs.getIntPref(prefix + "port.type")
        : 0;

      if (portType === PORT_TYPE_LEGACY)
        port = PORT_SIEVE_LEGACY;
      else if (portType === PORT_TYPE_CUSTOM && prefs.prefHasUserValue(prefix + "port"))
        port = prefs.getIntPref(prefix + "port");

      return { hostname, port };
    } catch {
      return {};
    }
  }
  /**
   * Reads mail server strings directly from Thunderbird preferences.
   *
   * @param {object} server
   *   the Thunderbird incoming server
   * @param {string[]} preferences
   *   preference suffixes in priority order
   * @returns {string}
   *   the first configured value, or an empty string
   */
  function getMailServerString(server, preferences) {
    let key = "";
    try {
      key = String(server.key || "");
    } catch {
      return "";
    }

    if (!key)
      return "";

    const prefs = Cc["@mozilla.org/preferences-service;1"]
      .getService(Ci.nsIPrefBranch);

    for (const preference of preferences) {
      const name = `mail.server.${key}.${preference}`;
      try {
        if (!prefs.prefHasUserValue(name))
          continue;

        const value = prefs.getStringPref(name);
        if (value)
          return value;
      } catch {
        try {
          const value = prefs.getCharPref(name, "");
          if (value)
            return value;
        } catch {
          // Preference has no usable string value.
        }
      }
    }

    return "";
  }

  /**
   * Reads a server string through compatible Thunderbird accessors.
   *
   * @param {object} server
   *   the Thunderbird incoming server
   * @param {string[]} properties
   *   object properties in priority order
   * @param {string[]} [preferences]
   *   server preference names in priority order
   * @returns {string}
   *   the first available value, or an empty string
   */
  function getServerString(server, properties, preferences = []) {
    for (const property of properties) {
      try {
        const value = server[property];
        if (value)
          return String(value);
      } catch {
        // Property is unavailable in this Thunderbird version.
      }
    }

    for (const preference of preferences) {
      try {
        const value = server.getCharValue(preference);
        if (value)
          return String(value);
      } catch {
        // Preference is unavailable in this Thunderbird version.
      }
    }

    return "";
  }


  /**
   * Implements a webextension api for sieve session and connection management.
   */
  class SieveAccountsApi extends ExtensionCommon.ExtensionAPI {
    /**
     * @inheritdoc
     */
    getAPI() {

      return {
        sieve: {
          accounts: {

            async getPrettyName(id) {
              return await getIncomingServer(id).prettyName;
            },

            async getPassword(id) {
              const server = getIncomingServer(id);

              // in case the passwordPromptRequired attribute is true...
              // ... thunderbird will take care on retrieving a valid password...
              if (server.passwordPromptRequired === false)
                return await server.password;

              return await undefined;
            },

            async getUsername(id) {
              const server = getIncomingServer(id);
              return getMailServerString(server, ["realuserName", "userName"])
                || getServerString(
                  server, ["realUsername", "username"],
                  ["realusername", "username"]);
            },

            async getHostname(id) {
              const server = getIncomingServer(id);
              const legacy = getLegacyServer(id);

              if (legacy.hostname)
                return legacy.hostname;

              // Thunderbird versions and migrated profiles expose the effective
              // hostname under different properties. Prefer the effective value
              // and retain the profile-backed fallbacks used by the importer.
              return getMailServerString(server, ["realhostname", "hostname"])
                || getServerString(
                  server, ["realHostName", "hostName"],
                  ["realhostname", "hostname"]);
            }
          }
        }
      };
    }
  }

  exports.SieveAccountsApi = SieveAccountsApi;

})(this);
