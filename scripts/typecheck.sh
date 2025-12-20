#!/bin/bash
vue-tsc --noEmit 2>&1 | \
  grep -v 'node_modules' | \
  grep -v '\.pnpm' | \
  grep -E '(^src/|^error TS|^Found)' || exit 0

