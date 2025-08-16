@echo off
setlocal enabledelayedexpansion

echo.
echo ==========================================
echo   OSRS Flip Dashboard - Auto Processor
echo ==========================================
echo.

:: Check if flips.csv exists in Documents
set "FLIPS_FILE=%USERPROFILE%\Documents\flips.csv"
if not exist "%FLIPS_FILE%" (
    echo ❌ ERROR: flips.csv not found in Documents folder
    echo    Please export your flips from RuneLite Flipping Copilot first
    echo    Expected location: %FLIPS_FILE%
    pause
    exit /b 1
)

echo ✅ Found flips.csv in Documents folder
echo.

:: Step 1: Process the data
echo 🚀 Step 1: Processing flip data...
echo ==========================================
call npm run process-flips
if !errorlevel! neq 0 (
    echo ❌ ERROR: Data processing failed
    pause
    exit /b 1
)
echo.

:: Step 2: Check for changes
echo 📊 Step 2: Checking for changes...
echo ==========================================
git status --porcelain > temp_status.txt
set /p CHANGES=<temp_status.txt
del temp_status.txt

if "%CHANGES%"=="" (
    echo ℹ️  No changes detected - data already up to date
    goto cleanup
)

echo ✅ Changes detected, proceeding with commit...
echo.

:: Step 3: Show what changed
echo 📈 Step 3: Summary of changes...
echo ==========================================
git status --short
echo.

:: Step 4: Commit changes
echo 💾 Step 4: Committing changes...
echo ==========================================
git add .
git commit -m "Data update - %date% %time:~0,8%"
if !errorlevel! neq 0 (
    echo ❌ ERROR: Git commit failed
    pause
    exit /b 1
)
echo ✅ Changes committed successfully
echo.

:: Step 5: Push to repository
echo 🚀 Step 5: Pushing to repository...
echo ==========================================
git push combined main
if !errorlevel! neq 0 (
    echo ❌ ERROR: Git push failed
    pause
    exit /b 1
)
echo ✅ Changes pushed to repository successfully
echo.

:: Step 6: Cleanup
:cleanup
echo 🧹 Step 6: Cleaning up...
echo ==========================================
if exist "%FLIPS_FILE%" (
    del "%FLIPS_FILE%"
    if !errorlevel! equ 0 (
        echo ✅ Removed flips.csv from Documents
    ) else (
        echo ⚠️  Warning: Could not remove flips.csv from Documents
    )
) else (
    echo ℹ️  flips.csv already removed
)
echo.

:: Success message
echo ==========================================
echo   🎉 PROCESS COMPLETED SUCCESSFULLY!
echo ==========================================
echo.
echo ✅ Data processed and deployed
echo ✅ Repository updated
echo ✅ Documents folder cleaned
echo.
echo Your OSRS flip dashboard is now up to date!
echo Vercel will automatically deploy the changes.
echo.
echo Press any key to close this window...
pause >nul