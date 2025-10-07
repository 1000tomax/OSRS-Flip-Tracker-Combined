@echo off
REM Windows launcher for deploy-flips.sh
REM Double-click this from anywhere on Windows

echo ========================================
echo OSRS Flip Tracker - Deployment
echo ========================================
echo.

REM Check if flips.csv exists in Windows Documents
set "FLIPS_CSV=%USERPROFILE%\Documents\flips.csv"
if exist "%FLIPS_CSV%" (
    echo Found flips.csv in Windows Documents
    echo Copying to WSL project...
    wsl cp "/mnt/c/Users/18159/Documents/flips.csv" "~/Documents/flips.csv"
    echo.
)

echo Starting deployment in WSL...
echo.

REM Run the script (using default WSL user)
wsl bash -c "cd ~/projects/OSRS-Flip-Tracker-Combined && ./deploy-flips.sh"

echo.
echo ========================================
echo Deployment finished!
echo ========================================
pause
