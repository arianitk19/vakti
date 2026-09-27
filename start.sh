#!/bin/sh
cd "$(dirname "$0")"
echo "Vakt: http://localhost:8080"
(python3 -m http.server 8080 || npx http-server -p 8080)
