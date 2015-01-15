#!/bin/sh
echo "This assumes that you have 3 repos named "greatwalks-builder", "greatwalks", and "greatwalks-android" in directories side-by-side."
DIR="$( cd "$( dirname "$0" )" && pwd )"
cd $DIR
cd ../..
git checkout master
git pull
git add -A
git commit -m "Automated commit"
git push
cd ../greatwalks
git checkout master
git pull
git add -A
git commit -m "Automated commit"
git push
git checkout gh-pages
git merge origin
git add -A
git commit -m "Automated commit"
git push origin gh-pages
cd ../greatwalks-builder
