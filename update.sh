#!/bin/sh

file_name=games_$(date -u +%Y%m%dT%H%M%S).db
echo "Downloading $file_name" >> update.log
curl "https://www.playtak.com/games_anon.db" --output $file_name >> update.log

echo "Beginning rating calculation" >> update.log
rating_file="./rating.json"
if test -f rating_file; 
then
  last_game_id=cat $rating_file | jq ".lastGameId"
else
  last_game_id=0
fi

npm run rating $file_name $last_game_id > $file_name.update.log

echo "Done" >> update.log
