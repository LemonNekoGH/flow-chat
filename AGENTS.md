# AGENTS.md

This document provides guidelines for AI agents working on the Flow Chat project.

## Commit Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types (type)

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring (no functional changes)
- `chore`: Chores (dependency updates, build config, documentation, etc.)
- `style`: Style changes (no logic changes)
- `docs`: Documentation
- `test`: Test related
- `perf`: Performance optimization

### Scope

Optional, used to identify the scope of the commit. Common scopes include:

- `ui`: UI components
- `tools`: Tools
- `schema`: Database schema
- `utils`: Utility functions
- `README`: Documentation
- `tutorial`: Tutorial related
- `settings`: Settings related

### Subject

- Use imperative mood, lowercase first letter
- No period at the end
- Be concise and clear, describing the main purpose of the commit

### Examples

```bash
# New features
feat: add multi-layer prompts and memory to templates
feat(tools): add `write_memory` tool (#94)

# Bug fixes
fix: token streaming (#85)
fix(schema): cascade delete rooms (#90)
fix: add in-flight guard for sending (close #87) (#88)

# Refactoring
refactor(ui): new input ui (#93)
refactor: migrate to `pglite` (#80)

# Chores
chore: bump deps (#78)
chore(README): add star history (#73)

# Style
style: better style for markdown view (#53)
```

### Issue References

- If the commit closes an issue, use `(close #87)` or `(fixes #87)`
- If the commit references an issue, use the format `(#94)`

### Notes

1. Commit messages should clearly describe the purpose of the change
2. If a commit involves multiple aspects, prioritize the most important type
3. Scope is optional and should only be used when it helps understand the commit
4. Keep commit messages concise; detailed explanations can be added in PR descriptions
