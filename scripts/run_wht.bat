@echo off
chcp 65001 >nul
set "PYTHONIOENCODING=utf-8"
set "PYTHONUTF8=1"
REM ============================================================
REM  run_wht.bat (CashMan 50 Tawi) - Task Scheduler: daily
REM  inbox\50 Tawi -> <YYYY>\50 Tawi\<Payer>\  +  CashMan\data\wht_income.js(.json)
REM  NOTE: does NOT git push (income data stays on this PC).
REM ============================================================
set "_gtry=0"
:waitG
if exist "G:\" goto :gok
set /a _gtry+=1
if %_gtry% geq 18 (
  echo [%DATE% %TIME%] G: not mounted - WHT NOT processed>>"%~dp0wht_log.txt"
  exit /b 0
)
ping -n 6 127.0.0.1 >nul
goto :waitG
:gok
cd /d "%~dp0"
set "PY="
if exist "C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\python.exe" set "PY=C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\python.exe"
where py >nul 2>nul && set "PY=py"
if not defined PY ( where python >nul 2>nul && set "PY=python" )
if not defined PY if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "PY=%LocalAppData%\Programs\Python\Python312\python.exe"
if not defined PY if exist "%LocalAppData%\Programs\Python\Python311\python.exe" set "PY=%LocalAppData%\Programs\Python\Python311\python.exe"
if not defined PY (
  echo [%DATE% %TIME%] python not found - WHT NOT processed>>"%~dp0wht_log.txt"
  exit /b 0
)
>>"%~dp0wht_log.txt" echo.
>>"%~dp0wht_log.txt" echo ==================== RUN %DATE% %TIME% ====================
"%PY%" parse_wht.py >>"%~dp0wht_log.txt" 2>&1
echo [%DATE% %TIME%] PY=%PY% parse rc=%errorlevel%>>"%~dp0wht_log.txt"
ping -n 3 127.0.0.1 >nul
exit /b 0
