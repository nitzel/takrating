#!/bin/sh

db_filename=games_$(date -u +%Y%m%dT%H%M%S).db
db_url="https://www.playtak.com/games_anon.db"
echo "Downloading $db_url to $db_filename"
curl $db_url --output $db_filename

rating_filename="rating.json"
rating_url="https://www.playtak.com/ratinglist.json"
echo "Downloading $rating_url to $rating_filename"
curl $rating_url --output $rating_filename

api_switch_db="http://localhost:8081/db/switch";
echo "Notify rating-server of new database ($api_switch_db)"
curl $api_switch_db --output /dev/null

