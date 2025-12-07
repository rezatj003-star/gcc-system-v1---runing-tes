@echo off
title GCC JSON SERVERS
echo =============================================
echo   STARTING GCC MULTI JSON-SERVER BACKEND (LAN MODE)
echo =============================================
echo.

REM === AUTH MODULE ===
echo [1/4] Starting AUTH server on port 5050...
start cmd /k "npx json-server --watch db-auth.json --port 5050 --host 0.0.0.0"

REM === COLLECTION MODULE ===
echo [2/4] Starting COLLECTION server on port 5051...
start cmd /k "npx json-server --watch db-collection.json --port 5051 --host 0.0.0.0"

REM === KASIR MODULE ===
echo [3/4] Starting KASIR server on port 5052...
start cmd /k "npx json-server --watch db-kasir.json --port 5052 --host 0.0.0.0"

REM === MASTER DATA MODULE ===
echo [4/4] Starting MASTER DATA server on port 5053...
start cmd /k "npx json-server --watch db-master.json --port 5053 --host 0.0.0.0"

echo.
echo =============================================
echo  ALL JSON SERVERS ARE NOW RUNNING
echo  ACCESS FROM OTHER DEVICES USING YOUR IP:
echo.
ipconfig | findstr /i "IPv4"
echo.
echo  Example:
echo  http://<your-ip>:5050/users
echo =============================================
echo.

pause