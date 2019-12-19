#!/bin/bash
set -e
set -o pipefail

echo Removing Docker.app
rm -rf /Applications/Docker.app
echo Removing Docker config
rm -rf ~/.docker
echo Removing Caches
rm -rf ~/Library/Caches/com.docker.docker
echo Removing Containers
rm -rf ~/Library/Containers/com.docker.docker
echo Removing Group
rm -rf ~/Library/Group\ Containers/group.com.docker

echo Removing Daemon \(Sudo\)
sudo rm -rf /Library/LaunchDaemons/com.docker.vmnetd.plist
echo Removing Privledged Helper Tools \(Sudo\)
sudo rm -rf /Library/PrivelegedHelperTools/com.docker.vmnetd
