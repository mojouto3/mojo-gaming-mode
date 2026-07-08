# Contributing to Mojo Gaming Mode

Thanks for considering a contribution. This is a small project, so the
process is kept simple.

## Before you start

- For anything beyond a small fix, open an issue first using the
  [feature request](.github/ISSUE_TEMPLATE/feature.yml) or
  [bug report](.github/ISSUE_TEMPLATE/bug.yml) template, so we can agree on
  the approach before you spend time on it.
- UI changes should include a description or mockup of what the change
  looks like before implementation starts.

## Branch naming

Use a short, descriptive prefix:

- `feat/short-description` for new features
- `fix/short-description` for bug fixes
- `chore/short-description` for tooling, docs, or maintenance

## Making changes

1. Fork the repo (or create a branch, if you have access)
2. Make your changes
3. Run the app locally and confirm the change works as expected
4. Open a pull request against `main` using the PR template
5. Fill in Summary, Added/Fixed, Files changed, and Testing sections

## Requirements before merging

- The CI syntax check must pass (runs automatically on every PR)
- At least one approving review is required
- Keep PRs focused: one feature or fix per PR is easier to review than a
  large mixed changeset

## Code style

- No em dashes in commit messages, PR titles, or issue titles
- No emoji in issue or PR titles
- Match the existing code style in the file you're editing rather than
  introducing a new pattern
- Comment non-obvious logic, especially anything involving Electron IPC,
  window state, or PowerShell script generation

## Reporting bugs vs security issues

Regular bugs go in [Issues](https://github.com/mojouto3/mojo-gaming-mode/issues).
Security-sensitive issues (privilege escalation, tweaks not reverting
correctly, arbitrary command execution) should be reported privately.
See [SECURITY.md](SECURITY.md) for how.

## Questions

If something is unclear before you start work, open an issue or ask in the
project's Discord rather than guessing.
