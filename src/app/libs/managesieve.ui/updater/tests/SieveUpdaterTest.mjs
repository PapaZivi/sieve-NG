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

/* global net */
const suite = net.tschmid.yautt.test;

if (!suite)
  throw new Error("Could not initialize test suite");

import { SieveUpdater } from "./../SieveUpdater.mjs";

const NUMBER_SIX = 6;
const RELEASE_BASE = "https://github.com/PapaZivi/sieve-NG/releases/download";

/**
 * Creates an application update manifest for tests.
 *
 * @param {object[]} updates
 *   update definitions
 * @returns {object}
 *   an update manifest
 */
function createManifest(updates) {
  return {
    applications: {
      "sieve-ng": {
        updates: updates
      }
    }
  };
}

/**
 * Creates a platform-specific update entry.
 *
 * @param {string} version
 *   the update version
 * @param {string} [platform]
 *   the target platform
 * @returns {object}
 *   an update entry
 */
function createUpdate(version, platform = "linux-x64") {
  return {
    version: version,
    "update_info_url": `https://github.com/PapaZivi/sieve-NG/releases/tag/${version}`,
    downloads: {
      [platform]: `${RELEASE_BASE}/${version}/sieve-NG-${version}-${platform}.zip`
    }
  };
}

suite.add("Major Version Bump", function () {
  suite.assertFalse((new SieveUpdater()).isOlder("6", "5.5.4"));
  suite.assertFalse((new SieveUpdater()).isOlder("6.5", "5.5.4"));
  suite.assertFalse((new SieveUpdater()).isOlder("6.5.4", "5.5.4"));

  suite.assertTrue((new SieveUpdater()).isOlder("6.5.4", "7.5.4"));

  suite.assertTrue((new SieveUpdater()).isOlder("6.5.4", "a.b.c"));
  suite.assertFalse((new SieveUpdater()).isOlder("a.b.c", "6.5.4"));
});

suite.add("Minor Version Bump", function () {
  suite.assertFalse((new SieveUpdater()).isOlder("6.5", "6.4.4"));
  suite.assertFalse((new SieveUpdater()).isOlder("6.5.4", "6.4.4"));
  suite.assertTrue((new SieveUpdater()).isOlder("6.5.4", "6.6.4"));

  suite.assertTrue((new SieveUpdater()).isOlder("6.5.4", "6.b.c"));
  suite.assertFalse((new SieveUpdater()).isOlder("6.b.c", "6.5.4"));
});

suite.add("Patch Version Bump", function () {
  suite.assertFalse((new SieveUpdater()).isOlder("6.5.4", "6.5.3"));
  suite.assertTrue((new SieveUpdater()).isOlder("6.5.4", "6.5.5"));

  suite.assertTrue((new SieveUpdater()).isOlder("6.5.4", "6.5.c"));
  suite.assertFalse((new SieveUpdater()).isOlder("6.5.c", "6.5.4"));

  suite.assertFalse((new SieveUpdater()).isOlder("26.10.1", "26.10"));
});

suite.add("No Version Bump", function () {
  suite.assertTrue((new SieveUpdater()).isOlder("6.5.4", "6.5.4"));
});


suite.add("Manifest - Does not contain any versions", function () {
  const manifest = createManifest([]);

  suite.assertFalse((new SieveUpdater()).compare(manifest, "6.5.4"));
});

suite.add("Manifest - Has newer version", function () {
  const manifest = createManifest([
    createUpdate("5.6.7"),
    createUpdate("1.2.3"),
    createUpdate("2.3.4")
  ]);

  suite.assertTrue((new SieveUpdater()).compare(manifest, "4.5.6"));
});

suite.add("Manifest - Same version", function () {
  const manifest = createManifest([
    createUpdate("5.6.7"),
    createUpdate("1.2.3"),
    createUpdate("2.3.4")
  ]);

  suite.assertFalse((new SieveUpdater()).compare(manifest, "5.6.7"));
});

suite.add("Manifest - Only older versions", function () {
  const manifest = createManifest([
    createUpdate("5.6.7"),
    createUpdate("1.2.3"),
    createUpdate("2.3.4")
  ]);

  suite.assertFalse((new SieveUpdater()).compare(manifest, "5.6.8"));
});

suite.add("Manifest - Select platform download", function () {
  const manifest = createManifest([
    createUpdate("26.10.1", "win32-x64")
  ]);

  const update = (new SieveUpdater()).findUpdate(
    manifest, "26.10", "win32", "x64");

  suite.assertEquals("26.10.1", update.version);
  suite.assertEquals(
    `${RELEASE_BASE}/26.10.1/sieve-NG-26.10.1-win32-x64.zip`,
    update.downloadUrl);
});

suite.add("Manifest - Ignore unsupported platform", function () {
  const manifest = createManifest([
    createUpdate("26.10.1", "win32-x64")
  ]);

  suite.assertFalse((new SieveUpdater()).compare(
    manifest, "26.10", "linux", "x64"));
});

suite.add("Manifest - Reject untrusted download", function () {
  const update = createUpdate("26.10.1");
  update.downloads["linux-x64"] = "https://example.com/update.AppImage";

  suite.assertFalse((new SieveUpdater()).compare(
    createManifest([update]), "26.10", "linux", "x64"));
});

suite.add("Comparator - greater than", function () {
  // Numeric comparison
  suite.assertTrue((new SieveUpdater()).isGreaterThan("6", "5"));
  suite.assertFalse((new SieveUpdater()).isGreaterThan("6", "6"));
  suite.assertFalse((new SieveUpdater()).isGreaterThan("6", "7"));

  // String Comparison in Unicode order
  suite.assertTrue((new SieveUpdater()).isGreaterThan("B", "A"));
  suite.assertTrue((new SieveUpdater()).isGreaterThan("AA", "A"));
  suite.assertFalse((new SieveUpdater()).isGreaterThan("A", "A"));
});

suite.add("Comparator - smaller than", function () {
  // Numeric comparison
  suite.assertTrue((new SieveUpdater()).isLessThan("6", "7"));
  suite.assertFalse((new SieveUpdater()).isLessThan("6", "6"));
  suite.assertFalse((new SieveUpdater()).isLessThan("6", "5"));

  // String Comparison in Unicode order
  suite.assertTrue((new SieveUpdater()).isLessThan("A", "B"));
  suite.assertTrue((new SieveUpdater()).isLessThan("A", "AA"));
  suite.assertFalse((new SieveUpdater()).isLessThan("A", "A"));
});

suite.add("Int conversion", function () {
  suite.assertEquals((new SieveUpdater()).getInt("6"), NUMBER_SIX);
  suite.assertEquals((new SieveUpdater()).getInt("6.5"), NUMBER_SIX);
  suite.assertEquals((new SieveUpdater()).getInt("6,5"), NUMBER_SIX);
  suite.assertNaN((new SieveUpdater()).getInt("A"));
});
