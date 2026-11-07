#!/bin/sh
# One still per shot, then a 6-wide contact sheet at out/storyboard.png
set -e
rm -rf out/storyboard && mkdir -p out/storyboard
npx remotion render src/index.ts Storyboard out/storyboard --sequence --frames=0-${SHOTS:-38} --image-format=png --scale=0.25 --log=error
swift scripts/contact.swift out/storyboard out/storyboard.png 6
echo "out/storyboard.png"
