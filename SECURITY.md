# Security Policy

Mojo Gaming Mode runs with Administrator rights and modifies Windows system
settings (services, registry values, process management). Because of that,
security issues here are taken seriously.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report it privately:

- Discord: DM the maintainer directly
- Or open a [private security advisory](https://github.com/mojouto3/mojo-gaming-mode/security/advisories/new) on this repository

Include as much detail as you can: what the issue is, how to reproduce it,
and what you think the impact is (for example: privilege escalation,
unintended persistent system changes, arbitrary code execution).

## What counts as a security issue here

Examples of things worth a private report rather than a public issue:

- A tweak that is not properly reverted and leaves the system in an
  unexpected state after "Deactivate" or after an unclean shutdown
- Any way for a tweak, custom rule, or imported rules file to execute
  arbitrary commands beyond its intended scope
- Ways the auto-updater could be tricked into installing something other
  than an official signed release
- Local privilege escalation beyond the Administrator rights the app
  already requests

Regular bugs, crashes, or UI issues are not security issues. Please file
those as normal [issues](https://github.com/mojouto3/mojo-gaming-mode/issues)
using the bug report template.

## Response

This is a small, actively maintained project. Reports are usually
acknowledged within a few days. Fixes ship in the next release, with credit
in the changelog unless you'd prefer to stay anonymous.
