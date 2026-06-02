@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
call "%SCRIPT_DIR%node-runner.cmd" "%SCRIPT_DIR%dooray-api-check.mjs" %*
exit /b %ERRORLEVEL%
