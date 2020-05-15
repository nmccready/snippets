#!/usr/bin/env bash
set -e pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$SCRIPT_DIR"

echo SCRIPT_DIR: $SCRIPT_DIR

ln -sf "$SCRIPT_DIR/bash"  $HOME/binSnip
