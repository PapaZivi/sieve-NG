#!/usr/bin/env python3
"""Exercise sieve-NG inside a running Thunderbird through Marionette."""

import argparse
import json
import sys
import time

from marionette_driver.errors import MarionetteException
from marionette_driver.marionette import Marionette


ADDON_ID = "sieve-ng@hightext.de"
TIMEOUT_SECONDS = 45
POLL_INTERVAL_SECONDS = 0.25


def connect():
    deadline = time.monotonic() + TIMEOUT_SECONDS
    last_error = None
    client = Marionette(host="127.0.0.1", port=2828)

    while time.monotonic() < deadline:
        try:
            client.start_session()
            break
        except Exception as error:  # The port can open before Marionette is ready.
            last_error = error
            time.sleep(POLL_INTERVAL_SECONDS)
    else:
        raise RuntimeError(f"Could not connect to Thunderbird Marionette: {last_error}")

    client.set_context(client.CONTEXT_CHROME)
    client.timeout.script = TIMEOUT_SECONDS
    return client


def wait_for(client, script, description, timeout=TIMEOUT_SECONDS):
    deadline = time.monotonic() + timeout
    last_value = None

    while time.monotonic() < deadline:
        last_value = client.execute_script(script)
        if last_value:
            return last_value
        time.sleep(POLL_INTERVAL_SECONDS)

    raise AssertionError(f"Timed out waiting for {description}; last value: {last_value!r}")


def execute_in_page(client, script):
    response = client.execute_async_script(
        """
          const pageScript = arguments[0];
          const done = arguments[arguments.length - 1];
          const win = Services.wm.getMostRecentWindow("mail:3pane");
          const browser = win.document.getElementById("tabmail")
            .currentTabInfo.browser;
          const actor = browser.browsingContext.currentWindowContext
            .getActor("MarionetteCommands");

          actor.executeScript(pageScript, [], {async: false, newSandbox: true})
            .then(
              result => done({ok: true, result}),
              error => done({ok: false, error: String(error), stack: error.stack})
            );
        """,
        script_args=(script,),
    )
    if not response["ok"]:
        raise RuntimeError(
            f"Could not execute in the add-on tab: {response['error']}\n"
            f"{response.get('stack', '')}"
        )
    return response["result"]


def wait_for_page(client, script, description, timeout=TIMEOUT_SECONDS):
    deadline = time.monotonic() + timeout
    last_value = None

    while time.monotonic() < deadline:
        last_value = execute_in_page(client, script)
        if last_value:
            return last_value
        time.sleep(POLL_INTERVAL_SECONDS)

    raise AssertionError(f"Timed out waiting for {description}; last value: {last_value!r}")


def page_script(body):
    return f"""
      const doc = document;
      {body}
    """


def run(client, startup_only=False):
    application = wait_for(
        client,
        """
          const win = Services.wm.getMostRecentWindow("mail:3pane");
          if (!win || win.document.readyState !== "complete") { return null; }
          return {name: Services.appinfo.name, version: Services.appinfo.version};
        """,
        "the main Thunderbird window",
    )
    print(f"Testing {application['name']} {application['version']}")

    addon = wait_for(
        client,
        f"""
          const policy = WebExtensionPolicy.getByID({json.dumps(ADDON_ID)});
          if (!policy?.active) {{ return null; }}
          return {{active: policy.active, name: policy.name}};
        """,
        "the active sieve-NG extension",
    )
    print(f"Loaded add-on: {addon['name']}")

    account = client.execute_script(
        """
          const manager = Cc["@mozilla.org/messenger/account-manager;1"]
            .getService(Ci.nsIMsgAccountManager);
          const account = manager.getAccount("account1");
          if (!account?.incomingServer) { return null; }
          account.incomingServer.password = "pencil";
          const preferences = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefBranch);
          return {
            configuredHostname: preferences.getStringPref(
              "mail.server.server1.hostname"
            ),
            username: account.incomingServer.username,
            passwordPromptRequired: account.incomingServer.passwordPromptRequired
          };
        """
    )
    if not account:
        raise AssertionError("The disposable IMAP test account was not created")
    if account["configuredHostname"] != "localhost" or account["username"] != "user":
        raise AssertionError(f"Unexpected account data: {account!r}")
    if account["passwordPromptRequired"]:
        raise AssertionError("Thunderbird did not accept the in-memory test password")

    menu_id = wait_for(
        client,
        """
          const win = Services.wm.getMostRecentWindow("mail:3pane");
          return win?.document.getElementById("appMenuSieveListDialog")?.id || null;
        """,
        "the sieve-NG application-menu entry",
    )
    print(f"Found menu entry: {menu_id}")

    opened = client.execute_script(
        """
          const win = Services.wm.getMostRecentWindow("mail:3pane");
          const item = win.document.getElementById("appMenuSieveListDialog");
          item.dispatchEvent(new win.Event("command", {bubbles: true}));
          return true;
        """
    )
    if not opened:
        raise AssertionError("Could not invoke the sieve-NG menu command")

    page_url = wait_for(
        client,
        """
          const win = Services.wm.getMostRecentWindow("mail:3pane");
          const tab = win?.document.getElementById("tabmail")?.currentTabInfo;
          const url = tab?.browser?.currentURI?.spec || "";
          return !tab?.busy && url.endsWith("/libs/managesieve.ui/accounts.html") ? url : null;
        """,
        "the sieve-NG account tab",
    )
    print(f"Opened account page: {page_url}")

    wait_for_page(
        client,
        page_script(
            """
              const account = doc.querySelector("#siv-account-account1");
              const connect = account?.querySelector(".sieve-script-connect");
              return connect ? true : null;
            """
        ),
        "the rendered Sieve test account",
    )

    if startup_only:
        print("Startup-only smoke test completed before the ManageSieve connection")
        return

    execute_in_page(
        client,
        page_script(
            """
              doc.querySelector("#siv-account-account1 .sieve-script-connect").click();
              return true;
            """
        )
    )

    wait_for_page(
        client,
        page_script(
            """
              const accept = doc.querySelector(".sieve-dialog-certerror")
                ?.closest(".modal")?.querySelector(".sieve-dialog-resolve");
              if (!accept) { return null; }
              accept.click();
              return true;
            """
        ),
        "the STARTTLS certificate warning",
    )
    print("Accepted the disposable server certificate")

    connection_result = wait_for_page(
        client,
        page_script(
            """
              const error = doc.querySelector(
                ".modal.show .sieve-error-dialog-description"
              )?.textContent?.trim();
              if (error) { return {status: "error", detail: error}; }
              if (doc.querySelector("#siv-account-account1 .sieve-script-empty-create")) {
                return {status: "connected"};
              }
              return null;
            """
        ),
        "an authenticated ManageSieve connection and LISTSCRIPTS response",
    )
    if connection_result["status"] != "connected":
        raise AssertionError(f"ManageSieve connection failed: {connection_result!r}")

    print("ManageSieve STARTTLS, authentication and LISTSCRIPTS succeeded")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--startup-only",
        action="store_true",
        help="stop after verifying the add-on UI; do not require a ManageSieve server",
    )
    arguments = parser.parse_args()

    client = None
    try:
        client = connect()
        run(client, startup_only=arguments.startup_only)
    except (AssertionError, MarionetteException, RuntimeError) as error:
        print(f"SMOKE TEST FAILED: {error}", file=sys.stderr)
        return 1
    finally:
        if client is not None:
            try:
                client.switch_to_default_content()
                client.set_context(client.CONTEXT_CHROME)
                client.execute_script(
                    "Services.startup.quit(Ci.nsIAppStartup.eForceQuit); return true;"
                )
            except Exception:
                pass

    print("SMOKE TEST PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
