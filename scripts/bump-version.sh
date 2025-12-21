#!/bin/bash

# Version bump automation script for InBrowserVideoComposer
# Usage: ./scripts/bump-version.sh [patch|minor|major]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Get bump type
BUMP_TYPE=${1:-patch}

if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo -e "${RED}Error: Invalid bump type. Use 'patch', 'minor', or 'major'${NC}"
  echo "Usage: ./scripts/bump-version.sh [patch|minor|major]"
  exit 1
fi

echo -e "${YELLOW}Bumping $BUMP_TYPE version...${NC}"

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('$PROJECT_ROOT/package.json').version")
echo -e "Current version: ${GREEN}$CURRENT_VERSION${NC}"

# Bump version using npm
cd "$PROJECT_ROOT"
npm version $BUMP_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('$PROJECT_ROOT/package.json').version")
echo -e "New version: ${GREEN}$NEW_VERSION${NC}"

# Get current timestamp in ISO 8601 with milliseconds
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ" 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# Update all documentation files with new version
echo -e "${YELLOW}Updating documentation files...${NC}"

# Function to update version in markdown files
update_version_in_file() {
  local file=$1
  if [ -f "$file" ]; then
    # Update version line
    sed -i.bak "s/\*\*Version:\*\* [0-9]*\.[0-9]*\.[0-9]*/\*\*Version:\*\* $NEW_VERSION/g" "$file"
    # Update Last Updated timestamp
    sed -i.bak "s/\*\*Last Updated:\*\* [0-9T:.Z-]*/\*\*Last Updated:\*\* $TIMESTAMP/g" "$file"
    rm "${file}.bak"
    echo -e "  ${GREEN}✓${NC} Updated $file"
  fi
}

# Update documentation files
update_version_in_file "$PROJECT_ROOT/ARCHITECTURE.md"
update_version_in_file "$PROJECT_ROOT/TASKLIST.md"
update_version_in_file "$PROJECT_ROOT/ROADMAP.md"
update_version_in_file "$PROJECT_ROOT/LEARNINGS.md"

# Update RELEASE_NOTES.md - just update the current version line at top
if [ -f "$PROJECT_ROOT/RELEASE_NOTES.md" ]; then
  sed -i.bak "s/\*\*Current Version:\*\* [0-9]*\.[0-9]*\.[0-9]*/\*\*Current Version:\*\* $NEW_VERSION/g" "$PROJECT_ROOT/RELEASE_NOTES.md"
  rm "${PROJECT_ROOT}/RELEASE_NOTES.md.bak"
  echo -e "  ${GREEN}✓${NC} Updated RELEASE_NOTES.md"
fi

# Update README.md version badge (if exists)
if [ -f "$PROJECT_ROOT/README.md" ]; then
  sed -i.bak "s/version-[0-9]*\.[0-9]*\.[0-9]*/version-$NEW_VERSION/g" "$PROJECT_ROOT/README.md"
  rm "${PROJECT_ROOT}/README.md.bak"
  echo -e "  ${GREEN}✓${NC} Updated README.md"
fi

echo -e "${GREEN}✓ Version bumped successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Review the changes: ${GREEN}git diff${NC}"
echo -e "  2. Test the application: ${GREEN}npm run dev${NC}"
echo -e "  3. Commit the changes: ${GREEN}git add . && git commit -m \"chore: bump version to $NEW_VERSION\"${NC}"
echo -e "  4. Remember to add co-author: ${GREEN}Co-Authored-By: Warp <agent@warp.dev>${NC}"
echo ""
