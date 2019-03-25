@echo off

call :add 2222   22 "ssh"
call :add 6379 6379 "redis"
call :add 9042 9042 "cassandra"
call :add 9160 9160 "cassandra thrift"
call :add 9200 9200 "elasticsearch"
call :add 9300 9300 "elasticsearch transport"

for /l %%i in (8000,1,8099) do (
  call :add %%i %%i "application %%i"
)

pause
exit /b 0

:add
setlocal
RULE=%~3,tcp,,%~1,,%~2
echo %RULE%
"C:\PROGRA~1\Oracle\VirtualBox\VBoxManage.exe" controlvm "ubuntu" natpf1 "%RULE%" || pause
exit /b 0
