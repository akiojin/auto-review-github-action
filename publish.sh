#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Usage: ./Publish.sh <major/minor/patch>"
    exit 1
fi

git switch main
git pull
npm version $1
git push
git push --tags
