#!/bin/bash

ZIP_NAME="release.zip"

zip -r "$ZIP_NAME" . --exclude ".git*" --exclude ".idea/*" --exclude "./scripts/*" --exclude "./repo-source.js" --exclude "$ZIP_NAME"

echo "$ZIP_NAME created"
