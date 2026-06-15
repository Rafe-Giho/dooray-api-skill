@echo off
setlocal EnableExtensions

if not "%DOORAY_API_NODE%"=="" if exist "%DOORAY_API_NODE%" (
  set "NODE_EXE=%DOORAY_API_NODE%"
  goto run
)

for %%N in (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node.exe"
  "%LOCALAPPDATA%\Programs\Codex\resources\app\node.exe"
  "%LOCALAPPDATA%\Programs\Codex\resources\app.asar.unpacked\node.exe"
  "%LOCALAPPDATA%\Programs\Codex\node.exe"
  "%PROGRAMFILES%\Codex\resources\app\node.exe"
  "%PROGRAMFILES%\nodejs\node.exe"
  "%PROGRAMFILES(X86)%\nodejs\node.exe"
) do (
  if exist "%%~N" (
    set "NODE_EXE=%%~N"
    goto run
  )
)

set "NODE_EXE=node"

:run
"%NODE_EXE%" %*
exit /b %ERRORLEVEL%
