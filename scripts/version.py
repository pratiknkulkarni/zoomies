"""
Bumps the version in `app.json` and `package.json`, and prints the result.

    python3 scripts/version.py patch|minor|major|X.Y.Z
    -> "1.0.1 2"

Two numbers, because Android needs both and they mean different things.
`version` is for a person — it appears in Settings and in the release title.
`versionCode` is for the package manager, which compares nothing else: an
install refuses to proceed if the incoming code is lower than the installed
one, whatever the version string says. So it only ever goes up, by one, and it
is never derived from the semver.

`package.json` carries the same `version` purely so the two files do not
disagree. Nothing reads it.
"""

import json
import re
import sys

APP_JSON = "app.json"
PACKAGE_JSON = "package.json"


def next_version(current: str, bump: str) -> str:
    if re.fullmatch(r"\d+\.\d+\.\d+", bump):
        return bump

    major, minor, patch = (int(part) for part in current.split("."))
    if bump == "major":
        return "%d.0.0" % (major + 1)
    if bump == "minor":
        return "%d.%d.0" % (major, minor + 1)
    if bump == "patch":
        return "%d.%d.%d" % (major, minor, patch + 1)
    sys.exit("Unknown bump %r. One of: patch, minor, major, or an X.Y.Z." % bump)


def read(path: str) -> dict:
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def write(path: str, data: dict) -> None:
    # Two-space indent and a trailing newline, matching what is already there,
    # so a version bump is a two-line diff rather than a reformat.
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: version.py patch|minor|major|X.Y.Z")

    app = read(APP_JSON)
    expo = app["expo"]
    version = next_version(expo["version"], sys.argv[1])
    version_code = int(expo["android"]["versionCode"]) + 1

    expo["version"] = version
    expo["android"]["versionCode"] = version_code
    write(APP_JSON, app)

    package = read(PACKAGE_JSON)
    package["version"] = version
    write(PACKAGE_JSON, package)

    print(version, version_code)


if __name__ == "__main__":
    main()
