@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ================================================
echo Family Photo Album - GitHub full synchronization
echo ================================================
echo.

if not exist ".git\" (
  echo ERROR: .git folder was not found here:
  echo %CD%
  echo.
  echo Extract the GITHUB ZIP into the existing local repository root,
  echo then run this BAT again.
  pause
  exit /b 1
)

if not exist "github-files.txt" (
  echo ERROR: github-files.txt is missing.
  pause
  exit /b 1
)

echo [1/5] Removing old GitHub frontend files not in this release...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=(Get-Location).Path; $keep=Get-Content -LiteralPath 'github-files.txt' | ForEach-Object { $_.Trim().Replace('/','\') } | Where-Object { $_ }; Get-ChildItem -LiteralPath $root -File -Recurse -Force | Where-Object { $_.FullName -notlike ($root+'\.git\*') } | ForEach-Object { $rel=$_.FullName.Substring($root.Length+1); if($keep -notcontains $rel){ Write-Host ('  DELETE '+$rel); Remove-Item -LiteralPath $_.FullName -Force } }; Get-ChildItem -LiteralPath $root -Directory -Recurse -Force | Where-Object { $_.FullName -notlike ($root+'\.git*') } | Sort-Object { $_.FullName.Length } -Descending | ForEach-Object { if(-not (Get-ChildItem -LiteralPath $_.FullName -Force | Select-Object -First 1)){ Remove-Item -LiteralPath $_.FullName -Force } }"
if errorlevel 1 goto :error

echo.
echo [2/5] Git status...
git status --short
if errorlevel 1 goto :error

echo.
echo [3/5] Staging new, changed and deleted files...
git add -A
if errorlevel 1 goto :error

echo.
echo [4/5] Creating commit...
git diff --cached --quiet
if not errorlevel 1 (
  echo No changes to publish. Repository is already synchronized.
  goto :done
)

git commit -m "Family Photo Album R17P2O22X4H"
if errorlevel 1 goto :error

echo.
echo [5/5] Pushing to GitHub...
git push
if errorlevel 1 goto :error

echo.
echo SUCCESS: GitHub repository synchronized with R17P2O22X4H.
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
