#!/bin/bash
# Install git hooks for CI/CD

set -e

echo "📦 Installing git hooks..."

# Create .git/hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy hooks
cp .githooks/pre-commit .git/hooks/pre-commit
cp .githooks/pre-push .git/hooks/pre-push

# Make hooks executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push
chmod +x .githooks/pre-commit
chmod +x .githooks/pre-push

echo "✅ Git hooks installed successfully!"
echo ""
echo "Hooks installed:"
echo "  • pre-commit: Runs fast unit tests (~1-2s)"
echo "  • pre-push: Runs full test suite (~5-10s)"
echo ""
echo "To skip hooks temporarily: git commit --no-verify"

