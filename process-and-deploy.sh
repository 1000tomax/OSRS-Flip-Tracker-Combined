#!/bin/bash

# OSRS Flip Dashboard - Auto Processor (Cross-platform version)
# This script works on Windows (Git Bash), macOS, and Linux

set -e  # Exit on any error

# Function to display elapsed time with decimal precision
elapsed_time() {
    local end_time=$(date +%s.%N 2>/dev/null || date +%s)
    if [[ "$end_time" == *"."* ]]; then
        # Linux/macOS with nanosecond support
        local elapsed=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "scale=1; $end_time - $start_time" | bc)
        printf "Completed in %.1fs\n" "$elapsed"
    else
        # Fallback for systems without nanosecond support
        local elapsed=$((end_time - start_time))
        echo "Completed in ${elapsed}s"
    fi
}

echo ""
echo "=========================================="
echo "  OSRS Flip Dashboard - Auto Processor"
echo "=========================================="
echo ""

# Determine the correct Documents path based on OS
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash)
    DOCUMENTS_PATH="$USERPROFILE/Documents"
else
    # macOS/Linux
    DOCUMENTS_PATH="$HOME/Documents"
fi

FLIPS_FILE="$DOCUMENTS_PATH/flips.csv"

# Step 0: Check if flips.csv exists
echo "Checking for flips.csv in Documents folder..."
if [[ ! -f "$FLIPS_FILE" ]]; then
    echo "ERROR: flips.csv not found in Documents folder"
    echo "       Please export your flips from RuneLite Flipping Copilot first"
    echo "       Expected location: $FLIPS_FILE"
    read -p "Press Enter to exit..."
    exit 1
fi

echo "Found flips.csv in Documents folder"
echo ""

# Step 1: Process the data
echo "Step 1: Processing flip data..."
echo "=========================================="
start_time=$(date +%s.%N 2>/dev/null || date +%s)
npm run process-flips
if [[ $? -ne 0 ]]; then
    echo "ERROR: Data processing failed"
    read -p "Press Enter to exit..."
    exit 1
fi
elapsed_time
echo ""

# Step 2: Check for changes
echo "Step 2: Checking for changes..."
echo "=========================================="
start_time=$(date +%s.%N 2>/dev/null || date +%s)
CHANGES=$(git status --porcelain 2>/dev/null)

if [[ -z "$CHANGES" ]]; then
    echo "No changes detected - data already up to date"
    elapsed_time
    echo "Proceeding to cleanup..."
    echo ""
    SKIP_GIT=true
else
    echo "Changes detected, proceeding with commit..."
    elapsed_time
    echo ""
    SKIP_GIT=false
fi

# Step 3: Show what changed (if there are changes)
if [[ "$SKIP_GIT" == false ]]; then
    echo "Step 3: Summary of changes..."
    echo "=========================================="
    git status --short
    echo ""

    # Step 4: Commit changes
    echo "Step 4: Committing changes..."
    echo "=========================================="
    start_time=$(date +%s.%N 2>/dev/null || date +%s)
    git add . >/dev/null 2>&1
    
    # Generate timestamp for commit message
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
    git commit -m "Data update - $TIMESTAMP" >/dev/null 2>&1
    
    if [[ $? -ne 0 ]]; then
        echo "ERROR: Git commit failed"
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo "Changes committed successfully"
    elapsed_time
    echo ""

    # Step 5: Push to repository
    echo "Step 5: Pushing to repository..."
    echo "=========================================="
    start_time=$(date +%s.%N 2>/dev/null || date +%s)
    git push combined main >/dev/null 2>&1
    
    if [[ $? -ne 0 ]]; then
        echo "ERROR: Git push failed"
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo "Changes pushed to repository successfully"
    elapsed_time
    echo ""
fi

# Step 6: Cleanup
echo "Step 6: Cleaning up..."
echo "=========================================="
start_time=$(date +%s.%N 2>/dev/null || date +%s)
if [[ -f "$FLIPS_FILE" ]]; then
    if rm "$FLIPS_FILE" 2>/dev/null; then
        echo "Removed flips.csv from Documents"
    else
        echo "Warning: Could not remove flips.csv from Documents"
    fi
else
    echo "flips.csv already removed"
fi
elapsed_time
echo ""

# Success message
echo "=========================================="
echo "  PROCESS COMPLETED SUCCESSFULLY!"
echo "=========================================="
echo ""
echo "Data processed and deployed"
echo "Repository updated"
echo "Documents folder cleaned"
echo ""
echo "Your OSRS flip dashboard is now up to date!"
echo "Vercel will automatically deploy the changes."
echo ""
echo "Press Enter to close..."
read