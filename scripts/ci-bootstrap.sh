#!/usr/bin/env bash
set -euo pipefail
test "$(uname -s)" = Linux
test "$(uname -m)" = x86_64
tools="$RUNNER_TEMP/website-builder-tools"
mkdir -p "$tools"
curl --fail --silent --show-error --location --retry 2 --max-time 120 https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-x64.tar.xz -o "$tools/node.tar.xz"
echo "fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6  $tools/node.tar.xz" | sha256sum --check --status
tar -xJf "$tools/node.tar.xz" -C "$tools"
export PATH="$tools/node-v24.21.0-linux-x64/bin:$PATH"
corepack enable pnpm
corepack prepare pnpm@10.34.6 --activate
curl --fail --silent --show-error --location --retry 2 --max-time 120 https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz -o "$tools/gitleaks.tar.gz"
echo "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb  $tools/gitleaks.tar.gz" | sha256sum --check --status
tar -xzf "$tools/gitleaks.tar.gz" -C "$tools" gitleaks
echo "$tools/node-v24.21.0-linux-x64/bin" >> "$GITHUB_PATH"
echo "$tools" >> "$GITHUB_PATH"
test "$(node --version)" = v24.21.0
test "$(pnpm --version)" = 10.34.6
test "$(docker info --format '{{.OSType}}')" = linux
docker compose version
