@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ================================================
echo Family Photo Album - GitHub Publish R17P2O22W
echo ================================================
echo.

if not exist ".git\" (
  echo ERROR: .git folder was not found in:
  echo %CD%
  echo.
  echo Keep the existing .git folder, extract this ZIP into the repository root,
  echo and run publish-github.bat again.
  pause
  exit /b 1
)

echo [1/4] Checking repository...
git status --short
if errorlevel 1 goto :error

echo.
echo [2/4] Staging new, changed and deleted files...
git add -A
if errorlevel 1 goto :error

echo.
echo Changes prepared for GitHub:
git status --short
if errorlevel 1 goto :error

echo.
echo [3/4] Creating commit...
git diff --cached --quiet
if not errorlevel 1 (
  echo No changes to publish. Repository is already synchronized.
  goto :done
)

git commit -m "Family Photo Album R17P2O22W"
if errorlevel 1 goto :error

echo.
echo [4/4] Pushing to GitHub...
git push
if errorlevel 1 goto :error

echo.
echo SUCCESS: R17P2O22W was pushed to GitHub.
goto :done

:error
echo.
echo ERROR: Publish stopped. Review the message above.
pause
exit /b 1

:done
echo.
echo You can now test the GitHub Pages version on the phone.
pause
exit /b 0
