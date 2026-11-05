@echo off
rem Builds the release APK.
rem
rem Building straight from D:\osteoshomecare_newapps\... fails on Windows with
rem   ninja: error: mkdir(...react-native-safe-area-context): No such file or directory
rem because the C++ build paths pass the 260-character limit. This script maps
rem the parent folder to a short drive letter (X:) and builds from there, then
rem removes the mapping. Double-click it, or run "build-apk" in this folder.
setlocal

set "DRIVE=X:"
for %%I in ("%~dp0.") do set "PROJECT=%%~nxI"
for %%I in ("%~dp0..") do set "PARENT=%%~fI"

rem Drop an old mapping of X: (e.g. left over from a cancelled build).
subst %DRIVE% /d >nul 2>&1
subst %DRIVE% "%PARENT%"
if errorlevel 1 (
  echo Could not map %DRIVE% to "%PARENT%". Is %DRIVE% already used by a real drive?
  echo Change DRIVE at the top of this file to a free letter, e.g. Y:
  exit /b 1
)

rem Run Gradle by its short path (no cd), so every build path starts with X:\.
set "ANDROID_DIR=%DRIVE%\%PROJECT%\android"
call "%ANDROID_DIR%\gradlew.bat" -p "%ANDROID_DIR%" assembleRelease
set "RESULT=%ERRORLEVEL%"

subst %DRIVE% /d >nul 2>&1

if not "%RESULT%"=="0" (
  echo.
  echo BUILD FAILED. If the error still mentions a long D:\ path, delete
  echo android\app\.cxx and run this script again.
  exit /b %RESULT%
)

echo.
echo APK ready: %~dp0android\app\build\outputs\apk\release\app-release.apk
endlocal
