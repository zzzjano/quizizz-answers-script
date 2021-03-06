# quizizz-answers-script
## Project is no longer maintained and probably doesn't work anymore.

This script uses node.js and express.js to show answers of a quizizz quiz using quizizz api.

## Features

- Obtain questions and answers for every type of quizizz even private ones,
- Supports math syntax,
- Shows image questions,
- Share answers by url,
- Fitler questions and answers by text.

This script uses unsecured quizizz's flashcards feature to obtain questions and answers list.

## Tech

List of packages that are used to make this script work:

- [Express](https://github.com/expressjs/express)
- [Socket.io](https://github.com/socketio/socket.io) - used to communicate between client and server
- [TorAgent](https://github.com/danielstjules/toragent) - provides unique ip for each request
- [socks5-node-fetch](https://github.com/ciqulover/socks5-node-fetch)
- [random-useragent](https://github.com/skratchdot/random-useragent)

## Installation and usage

```sh
cd quizizz-answers-script
npm i
npm run start
```

You can host this script locally and access it on http://localhost:8080 

![home](https://i.imgur.com/6pzXYdG.png)
![answers](https://i.imgur.com/BSd1OH5.png)
