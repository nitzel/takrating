### Tak rating calculation

#### To run locally:
- Download the database from [PlayTak](www.playtak.com/games)
-
  ```sh
  npm install
  npm run rating <path/to/database.db> <lastRunGameId or 0>
  ```


# Setting up the service
- install node
- `npm install` to install the requirements
- Web Server
  - `npm install pm2 --global` to keep the web server running
  - `pm2 start ./server.js`
  - `ufw allow 8080` or whatever port you'd like to expose it through
    - If you chose a port that was not `8080` and haven't changed the `server.js` you need to forward the port `server.js` uses to the one you exposed, in this case, 80:
      ```
      iptables -t nat -I PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080
      ```
- Setting up the cronjob
  - `apt install jq` to parse the json file for updating
  - `chmod +x ./update.sh` to make it executable
  - `crontab -e` and add
    ```
    # Update at 17:10 UTC every day. If your machine is not UTC, change accordingly.
    # It might be the best to change your machine's timezone to UTC.
    10 5 * * * cd ~/takrating && ./update.sh
    ```