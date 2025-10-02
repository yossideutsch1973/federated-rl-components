#!/bin/bash
# Documentation Cleanup Script
# Consolidates 28 MD files → 6 MD files

set -e  # Exit on error

echo "🧹 Starting documentation cleanup..."

# Move completed task docs to archive
echo "📦 Archiving completed task documents..."
mv docs/NEXT-SESSION-MAGNET-CONTROL.md docs/_archive/ 2>/dev/null || true
mv docs/METRICS-KPI-DESIGN.md docs/_archive/ 2>/dev/null || true

# Delete redundant root-level MDs (content merged into README.md)
echo "🗑️  Removing redundant root-level docs..."
rm -f HANDOFF.md
rm -f MILESTONE-SUMMARY.md  
rm -f README-FEDERATED-RL.md
rm -f START-HERE.md
rm -f CONSOLIDATION-PLAN.md

# Delete redundant docs/ files (consolidated into ARCHITECTURE.md)
echo "🗑️  Removing consolidated docs..."
rm -f docs/COMPONENT-LIBRARY-GUIDE.md
rm -f docs/PROJECT-STATUS.md
rm -f docs/RIGOROUS-IMPROVEMENTS-OCT2025.md

# Move guides to archive (will create single GUIDES.md)
echo "📦 Archiving old guides..."
mv docs/CONVERGENCE-ACCELERATION.md docs/_archive/ 2>/dev/null || true
mv docs/TRANSFER-LEARNING-GUIDE.md docs/_archive/ 2>/dev/null || true
mv docs/INFERENCE-MODE-FINAL.md docs/_archive/ 2>/dev/null || true
mv docs/LLM-INTEGRATION-SUMMARY.md docs/_archive/ 2>/dev/null || true

# Count remaining files
echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Final structure:"
echo "Root MD files:"
ls -1 *.md 2>/dev/null | wc -l || echo "0"
echo ""
echo "docs/ MD files:"
ls -1 docs/*.md 2>/dev/null | wc -l || echo "0"
echo ""
echo "Archived files:"
ls -1 docs/_archive/*.md 2>/dev/null | wc -l || echo "0"

