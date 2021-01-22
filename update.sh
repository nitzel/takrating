#!/bin/sh

file_name=games_$(date -u +%Y%m%dT%H%M%S).db
echo "Downloading $file_name" >> update.log
curl "https://www.playtak.com/games_anon.db" --output $file_name >> update.log

echo "Beginning rating calculation" >> update.log
npm run rating $file_name > $file_name.update.log

echo "Done" >> update.log
