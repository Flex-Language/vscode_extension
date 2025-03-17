@echo off
REM Windows batch file to run Flex programs

REM Get the absolute path of the input file
SET INPUT_FILE=%1
SET ABSOLUTE_PATH=%~f1

REM Path to the Sindbad directory
SET SINDBAD_DIR=C:\path\to\Sindbad\src

REM Change to the Sindbad/src directory
cd /d "%SINDBAD_DIR%"

REM Run the Flex interpreter with the absolute path
python main.py "%ABSOLUTE_PATH%" 