@echo off
chcp 65001 >nul
title Push Undangan Digital ke GitHub
echo ==============================================================================
echo       UNGGAH (PUSH) UNDANGAN DIGITAL KE GITHUB REPOSITORY
echo ==============================================================================
echo Remote URL: https://github.com/SIDIQNUGROHO22/UNDANGAN.git
echo Branch    : main
echo.
set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"

echo [1/3] Memeriksa status repositori Git...
git status -s

echo.
echo [2/3] Mengonfirmasi perubahan...
git add .
git commit -m "Siapkan deployment GitHub Pages dan optimasi web undangan" 2>nul

echo.
echo [3/3] Melakukan push ke GitHub...
echo.
echo ==============================================================================
echo PERHATIAN:
echo Jika muncul jendela popup "GitHub Login / Git Credential Manager":
echo Silakan klik "Sign in with your browser" lalu klik "Authorize".
echo ==============================================================================
echo.

git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==============================================================================
    echo [SUKSES] Seluruh file berhasil diunggah ke GitHub!
    echo ==============================================================================
    echo.
    echo Website siap diaktifkan di GitHub Pages:
    echo 1. Buka https://github.com/SIDIQNUGROHO22/UNDANGAN/settings/pages
    echo 2. Di bagian "Source", pilih "GitHub Actions" atau "Deploy from a branch" (main / root)
    echo 3. Website Anda akan aktif di: https://sidiqnugroho22.github.io/UNDANGAN/
    echo ==============================================================================
) else (
    echo.
    echo ==============================================================================
    echo [PERHATIAN] Push belum berhasil.
    echo Pastikan Anda telah mengizinkan login di jendela browser yang terbuka,
    echo atau Anda dapat menggunakan GitHub Personal Access Token (PAT).
    echo ==============================================================================
)

echo.
pause
