#!/bin/bash

# Configuration
DIST_DIR="./dist"
GAMES_DIR="$DIST_DIR/games"
DRAGON_BREATH_SRC="../dragon-breath"
TRUMP_DEMOCRATS_SRC="../trump-vs.-the-democrats"

echo "🚀 Starting packaging process..."

# 1. Clean and create dist directory
rm -rf "$DIST_DIR"
mkdir -p "$GAMES_DIR"

# 2. Copy landing page files
cp index.html style.css script.js arcade-music.m4a diggy_arcade.jpg "$DIST_DIR/"
echo "✅ Copied landing page files and assets."

# Function to fix absolute paths in index.html for bundled games
fix_paths() {
    local file=$1
    echo "🔧 Fixing paths in $file..."
    # Replace absolute-style root paths with relative paths
    sed -i '' 's|src="/|src="./|g' "$file"
    sed -i '' 's|href="/|href="./|g' "$file"
}

# Function to build and package a game
build_and_package() {
    local src_dir=$1
    local dest_name=$2
    local game_dest="$GAMES_DIR/$dest_name"
    
    echo "📦 Packaging $dest_name..."
    
    if [ -d "$src_dir" ]; then
        if [ -f "$src_dir/package.json" ]; then
            echo "🏗️ Building $dest_name..."
            (cd "$src_dir" && npm install && npm run build)
        fi
        
        if [ -d "$src_dir/dist" ]; then
            echo "✅ Copying $dest_name from dist..."
            mkdir -p "$game_dest"
            cp -r "$src_dir/dist/"* "$game_dest/"
            
            if [ -f "$game_dest/index.html" ]; then
                fix_paths "$game_dest/index.html"
            fi
        else
            echo "⚠️ Warning: $dest_name dist folder not found after build."
            # Fallback for simple games without a dist folder (if applicable)
            if [ -f "$src_dir/index.html" ]; then
                echo "📂 Copying $dest_name source as fallback..."
                mkdir -p "$game_dest"
                cp -r "$src_dir/"* "$game_dest/"
                fix_paths "$game_dest/index.html"
            fi
        fi
    else
        echo "❌ Error: $dest_name source directory not found at $src_dir"
    fi
}

# 3. Build and Package Trump vs The Democrats
build_and_package "$TRUMP_DEMOCRATS_SRC" "trump-vs-democrats"

# 4. Build and Package Dragon Breath
build_and_package "$DRAGON_BREATH_SRC" "dragon-breath"

# Special fix for Dragon Breath if it's a raw source copy (adding missing script tag)
if [ -f "$GAMES_DIR/dragon-breath/index.html" ] && ! grep -q "index.tsx" "$GAMES_DIR/dragon-breath/index.html"; then
    if [ -f "$GAMES_DIR/dragon-breath/index.tsx" ]; then
        echo "🩹 Adding missing script tag to Dragon Breath index.html"
        sed -i '' 's|</div>|</div><script type="module" src="./index.tsx"></script>|' "$GAMES_DIR/dragon-breath/index.html"
    fi
fi

echo "✨ Packaging complete! Files are in $DIST_DIR"
