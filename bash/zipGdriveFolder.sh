#!/bin/sh
set -e
set -o pipefail

PWD=`pwd`;

# echo $PWD

# EXAMPLE: ./zipGdriveFolder.sh -f 2017-2019 -d ~/Desktop

# Purpose is to move a folder from gdrive and zip it up with all the crap icons and unecessary files removed

while [[ "$#" > 0 ]]; do case $1 in
  -f|--folder) shift; folder=$1;;
  -d|--dest) shift; dest=$1;;
  *) echo "Unknown parameter passed: $1"; exit 1;;
esac; shift; done

required=( dest folder )

for i in "${required[@]}"
do
  if [[ -z ${!i} ]]; then
    echo "required arg $i was not passed"
    exit 1;
  fi
done

cp -R "$PWD/$folder" "$dest/."
cd "$dest"

mv $folder mccready_$folder
folder=mccready_$folder

cd "$folder"
#remove bloat
find . -name ".DS_Store" -type f -delete
find . -name "Icon?" -type f -delete
cd ..

zip -9 -r "$folder".zip "$folder"
rm -rf "$folder"
