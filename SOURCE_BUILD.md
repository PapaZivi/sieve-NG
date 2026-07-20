# Source build instructions for reviewers

## Add-on

- Name: sieve-NG
- Version: 0.6.2
- Repository: https://github.com/PapaZivi/sieve-NG
- License: GNU Affero General Public License v3.0

The submitted XPI is generated from source files by Gulp. The build copies the
extension sources and dependencies into a staging directory, adapts module file
extensions for the Thunderbird package, and creates the final XPI archive.

No proprietary or web-based build tools are required. Dependencies are obtained
from the official npm registry according to the included `package-lock.json`.

## Build environment

The add-on can be built in Mozilla's default reviewer environment:

- Ubuntu 24.04 LTS
- Node.js 24.14.0 or another compatible Node.js 24 release
- npm 11.9.0 or another compatible npm 11 release
- Network access to the official npm registry during dependency installation

The release was additionally verified on Windows with Node.js 24.

## Build commands

Run these commands from the root directory of the extracted source archive:

```bash
npm ci
npm run gulp -- "wx:package-xpi"
```

The resulting add-on is:

```text
build/sieve-NG-0.6.2.xpi
```

For a clean rebuild, run:

```bash
npm run gulp -- clean
npm run gulp -- "wx:package-xpi"
```

## Tests

The optional test suite can be executed with:

```bash
npm test
```

It contains 261 tests. ESLint can be run with `npm run lint`; the inherited
upstream source currently reports warnings but no lint errors.

## Included third-party libraries

CodeMirror and Bootstrap are installed through npm using the locked versions in
`package-lock.json` and copied into the packaged extension by the Gulp build.
Their license information is documented in `LICENSING_INFO.md`.