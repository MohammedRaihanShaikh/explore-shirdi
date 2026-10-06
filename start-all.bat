@echo off
echo ========================================================
echo   Launching Explore Shirdi Full-Stack Application
echo ========================================================
start "Explore Shirdi - Backend (FastAPI)" cmd /c "cd Backend && python run.py"
timeout /t 3 /nobreak >nul
start "Explore Shirdi - Frontend (Next.js)" cmd /c "cd Frontend && npm run dev"
echo Backend and Frontend have been launched in separate windows!
echo - API & Swagger Docs: http://localhost:8000/docs
echo - Devotee Portal:     http://localhost:3000
