@REM This assumes that you have 3 repos named "greatwalks-builder", "greatwalks", and "greatwalks-android" in directories side-by-side.
cd %0\..\..\..\
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
copy ..\greatwalks-android\bin\greatwalks-android.apk .
git add -A
git commit -m "Automated commit"
git push origin gh-pages
git checkout master
cd ../greatwalks-android
git submodule foreach git pull origin master
git add -A
git commit -m "Automated commit"
git push
cd ../greatwalks-builder
