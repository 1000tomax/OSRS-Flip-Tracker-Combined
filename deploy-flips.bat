@echo off
REM Windows launcher for deploy-flips.sh
REM This opens WSL and runs the deployment script

echo ========================================
echo OSRS Flip Tracker - Deployment
echo ========================================
echo.
echo Starting deployment in WSL...
echo.

REM Run the script and keep window open to see errors
wsl bash -c "cd ~/projects/OSRS-Flip-Tracker-Combined && ./deploy-flips.sh; echo ''; echo '========================================'; echo 'Press Enter to close this window...'; read dummy"
