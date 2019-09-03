#!/bin/bash
echo rm bin/vh-config
rm bin/vh-config

echo npm list -g --depth 0 | grep "pkg"
npm list -g --depth 0 | grep "pkg"

echo pkg vh-config.js -t macos --output bin/vh-config
pkg vh-config.js -t macos --output bin/vh-config && echo "Build completed!"
