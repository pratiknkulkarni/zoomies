"""
JSON in and out for `scripts/gitea.sh`.

This is a separate file rather than `python3 -c` inside the shell script
because the two languages disagree about quoting, and the escaping needed to
nest one in the other is where the bugs live. Everything user-typed enters
through `argv` and leaves through `json.dumps`, so no text is ever pasted into
a shell word or a hand-built JSON string.
"""

import json
import sys


def encode(args: list[str]) -> None:
    """
    encode k v [k v ...] [--bool k true|false]

    A value of `@path` reads the file at that path, which is how a release body
    written by `release.sh` reaches the API without going through the shell.
    """
    out: dict[str, object] = {}
    i = 0
    while i < len(args):
        if args[i] == "--bool":
            out[args[i + 1]] = args[i + 2] == "true"
            i += 3
            continue
        key, value = args[i], args[i + 1]
        if value.startswith("@"):
            with open(value[1:], encoding="utf-8") as handle:
                value = handle.read()
        out[key] = value
        i += 2
    print(json.dumps(out))


def list_issues() -> None:
    rows = json.load(sys.stdin)
    if not rows:
        print("No issues.")
        return
    for issue in rows:
        print("#%-4d %s" % (issue["number"], issue["title"]))
        meta = [issue["created_at"][:10]]
        labels = [label["name"] for label in issue.get("labels") or []]
        if labels:
            meta.append(", ".join(labels))
        if issue.get("comments"):
            meta.append("%d comment(s)" % issue["comments"])
        if issue["state"] != "open":
            meta.append(issue["state"])
        print("      " + "  ".join(meta))


def show_issue() -> None:
    issue = json.load(sys.stdin)
    print("#%d  %s" % (issue["number"], issue["title"]))
    print("%s, opened %s by %s"
          % (issue["state"], issue["created_at"][:10], issue["user"]["login"]))
    labels = [label["name"] for label in issue.get("labels") or []]
    if labels:
        print("labels: " + ", ".join(labels))
    print()
    print((issue.get("body") or "(no description)").strip())


def show_comments() -> None:
    for comment in json.load(sys.stdin):
        print()
        print("--- %s, %s ---"
              % (comment["user"]["login"], comment["created_at"][:10]))
        print((comment.get("body") or "").strip())


def list_labels() -> None:
    for label in json.load(sys.stdin):
        print("%-12s #%s  %s"
              % (label["name"], label["color"], label.get("description") or ""))


def release_id() -> None:
    body = json.load(sys.stdin)
    if "id" not in body:
        sys.exit("Gitea refused the release: %s" % body.get("message", body))
    print(body["id"])


COMMANDS = {
    "encode": None,  # takes argv rather than stdin
    "list-issues": list_issues,
    "show-issue": show_issue,
    "show-comments": show_comments,
    "list-labels": list_labels,
    "release-id": release_id,
}

if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else ""
    if name == "encode":
        encode(sys.argv[2:])
    elif name in COMMANDS:
        COMMANDS[name]()
    else:
        sys.exit("Unknown command %r. One of: %s"
                 % (name, ", ".join(COMMANDS)))
