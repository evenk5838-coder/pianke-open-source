#!/bin/zsh
set -e
cd -- "${0:A:h}"
app_path="${1:-${PWD:h}/片刻.app}"
mkdir -p "$app_path/Contents/MacOS" "$app_path/Contents/Resources/web"
xcrun clang -fobjc-arc -O2 -mmacosx-version-min=14.0 -framework Cocoa -framework WebKit -framework Carbon Pianke.m -o "$app_path/Contents/MacOS/Pianke"
cp Info.plist "$app_path/Contents/Info.plist"
cp native.js "$app_path/Contents/Resources/native.js"
for item in index.html style.css iteration.css eye-guide.css body-guide.css app.js motion.js content.js ambience.js eye-guide.js body-guide.js README.md LICENSE VERIFICATION.md; do
  cp "../pianke/$item" "$app_path/Contents/Resources/web/$item"
done
cp -R ../pianke/assets "$app_path/Contents/Resources/web/"
codesign --force --sign - "$app_path"
print "已构建：$app_path"
