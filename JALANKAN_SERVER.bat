@echo off
title Server Undangan Digital Pernikahan
color 0A
cd /d "%~dp0"

echo ================================================================
echo   SERVER UNDANGAN DIGITAL PERNIKAHAN
echo ================================================================
echo.
echo   Link Undangan Tamu : http://localhost:3000
echo   Contoh Link WA     : http://localhost:3000/?to=Bapak+Budi+Santoso
echo   Panel Khusus Admin : http://localhost:3000/admin
echo.
echo   Login Admin Default:
echo     Email    : admin@wedding.com
echo     Password : admin123
echo.
echo   (Jendela ini jangan ditutup selama website ingin diakses)
echo ================================================================
echo.

:: Otomatis buka browser ke panel admin setelah delay 1.5 detik
start /b "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000/admin"

:: 1. Cek Node.js
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Menjalankan server menggunakan Node.js...
    node backend\server.js
    goto selesai
)

:: 2. Cek Path Python Khusus di Komputer Ini
if exist "D:\Users\sidiq.nugroho\AppData\Local\Programs\Python\Python315\python.exe" (
    echo [OK] Menjalankan server menggunakan Python 3.15...
    "D:\Users\sidiq.nugroho\AppData\Local\Programs\Python\Python315\python.exe" -u backend\server.py
    goto selesai
)

if exist "%LOCALAPPDATA%\Programs\Python\Python315\python.exe" (
    echo [OK] Menjalankan server menggunakan Python 3.15...
    "%LOCALAPPDATA%\Programs\Python\Python315\python.exe" -u backend\server.py
    goto selesai
)

:: 3. Cek Python standar PATH
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Menjalankan server menggunakan Python standar...
    python -u backend\server.py
    goto selesai
)

:: 4. Cek Python Launcher (py)
where py >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Menjalankan server menggunakan Python Launcher...
    py -u backend\server.py
    goto selesai
)

echo [PERINGATAN] Node.js maupun Python belum terdeteksi di sistem PATH.
echo Membuka halaman admin secara langsung...
start "" "frontend\admin.html"
echo.
:selesai
pause
