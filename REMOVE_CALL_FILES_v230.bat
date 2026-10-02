@echo off
setlocal
cd /d "%~dp0"

del /q "src\BoardVideoCallPanel.tsx" 2>nul
del /q "src\boardCallRealtime.ts" 2>nul
del /q "src\boardCallStore.ts" 2>nul
del /q "src\webrtcConfig.ts" 2>nul
if exist "supabase\functions\turn-credentials" rmdir /s /q "supabase\functions\turn-credentials"
if exist "deploy\coturn" rmdir /s /q "deploy\coturn"

echo Call feature source files removed.
pause
