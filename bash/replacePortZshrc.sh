#!/bin/bash
#script change port
#Get random port number between 9998 to 11000
port=$(( 100+( $(od -An -N2 -i /dev/random) )%(11000-9998+1) ))
#Make sure $port is not assigned if so again find new random port
while :
do(echo >/dev/tcp/localhost/$port) &>/dev/null &&  port=$(( 100+( $(od
-An -N2 -i /dev/random) )%(11000-9998+1) )) || break
done
#sed to change rc file
sed -ie 's/address=*[0-9]$/address='$port'/gI' ~/zshrc