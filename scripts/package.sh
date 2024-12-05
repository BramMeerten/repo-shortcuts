#!/bin/bash

ZIP_NAME="release.zip"
SETTINGS_JS_FILE="settings.js"
MANIFEST_FILE="manifest.json"

# Check if version has been updated by developer
settingsVersion=$(grep '^const VERSION = ' "$SETTINGS_JS_FILE" | sed -E 's/^const VERSION = "(.*)";/\1/')
manifestVersion=$(grep '"version": ' "$MANIFEST_FILE" | sed -E 's/.*"version": "(.*)",/\1/')

if [ "$settingsVersion" == "$manifestVersion" ]; then
    echo "Version in \"settings.js\" is unchanged."
    echo -n "Do you want to continue? (y/n): "
    read -r RESPONSE
    if [[ ! "$RESPONSE" =~ ^[Yy]$ ]]; then
      exit 0
    fi
fi

# Update manifest.json version based on version from code
sed -i '' -E "s/\"version\": \".*\"/\"version\": \"$settingsVersion\"/" "$MANIFEST_FILE"
echo "Manifest version set to: $settingsVersion"
echo ""

# Create zip
zip -r "$ZIP_NAME" . --exclude ".git*" --exclude ".idea/*" --exclude "./scripts/*" --exclude "./repo-source.js" --exclude ".DS_Store" --exclude "preview.gif" --exclude "$ZIP_NAME"

echo ""
echo "$ZIP_NAME created"
