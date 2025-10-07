@echo off
REM Windows launcher for deploy-flips.sh
REM This opens WSL and runs the deployment script

echo Starting deployment in WSL...
echo.

wsl -e bash -c "cd ~/projects/OSRS-Flip-Tracker-Combined && ./deploy-flips.sh"

echo.
echo Deployment complete. Press any key to close...
pause >nul
