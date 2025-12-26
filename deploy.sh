#!/bin/bash

# Configuration
BUCKET_NAME="diggyarcade.com"

echo "🚀 Starting S3 deployment for $BUCKET_NAME..."

# 1. Run the packaging script
./package.sh

# 2. Check if packaging was successful
if [ $? -eq 0 ]; then
    echo "✅ Packaging complete. Starting upload..."
    # 3. Run the JavaScript deployment script
    node deploy.js "$BUCKET_NAME"
else
    echo "❌ Packaging failed. Aborting deployment."
    exit 1
fi
