@echo off
cls
echo bot will restart when it crashes
title Jimmy Bot

:StartServer
echo (%time%) starting the bot
start /wait node %~dp0/mcf-bet-no-dc-public/start.js
echo (%time%) restarting the bot
goto StartServer
