#!/bin/sh

# このスクリプトは、リポジトリ内のgithooksディレクトリから
# .git/hooksディレクトリへシンボリックリンクを作成します。

set -e

# Gitリポジトリのルートディレクトリを基準にパスを解決
GIT_DIR=$(git rev-parse --git-dir)
HOOKS_DIR="$GIT_DIR/hooks"
SOURCE_HOOKS_DIR="dev_utils/githooks"

echo "Installing Git hooks to $HOOKS_DIR..."

# pre-commitフックのシンボリックリンクを作成
# -f フラグは、既存のフックが存在する場合に上書きします
# リンク元には相対パスを使用します
ln -s -f "../../$SOURCE_HOOKS_DIR/pre-commit" "$HOOKS_DIR/pre-commit"

echo "Pre-commit hook installed successfully."
echo "Please add execute permission to the hook script if you haven't."
