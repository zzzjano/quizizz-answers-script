const app = require('express')();
var express = require('express');
const http = require('http').Server(app);
const io = require('socket.io')(http);
var path = require('path');
const fs = require('fs');
const wrappedFetch = require('socks5-node-fetch')
var TorAgent = require('toragent');
const randomUseragent = require('random-useragent');
const cors = require('cors');

var port = 8080;

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use('/scripts', express.static(__dirname + '/node_modules/'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
    origin: '*'
}));

app.get('/', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(__dirname + '/index.html');
});

app.get('/answers/:code', (req, res) => {
    if (fs.existsSync(__dirname + '/public/answers/' + req.params.code + '.html')) {
        res.sendFile(__dirname + '/public/answers/' + req.params.code + '.html');
    } else {
        res.status(404).send('File was not found.');
    }

});

app.get('*', function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(404).send('File was not found.');
});

io.on('connection', (socket) => {

    var shared = false;
    // Create shareable url with answers for quiz
    socket.on('share', async (data) => {
        if (!shared) {
            share(data);
            shared = true;
        }
    });
    socket.on('code', async (code) => {

        TorAgent.create(true).then(async function (agent) {
            var fetch = wrappedFetch({
                socksHost: 'localhost',
                socksPort: agent.options.tor.port
            })

            await answers(code.code, socket, fetch, randomUseragent.getRandom());

            await agent.destroy();
        });

    });
});

http.listen(port, () => {
    console.log('listening on *:' + port);
});

function share(data) {
    fs.writeFile("public/answers/" + data.code + ".html", '<!DOCTYPE html><html class="bg-dark"><head><script src="https://kit.fontawesome.com/4541f2dd6e.js" crossorigin="anonymous"></script><meta charset="UTF-8"><title>wtf is this</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.12.0/dist/katex.min.css" integrity="sha384-AfEj0r4/OFrOo5t7NnNe46zW/tFgW6x/bCJG8FqQCEo3+Aro6EYUG4+cU+KJWu/X" crossorigin="anonymous"><!-- The loading of KaTeX is deferred to speed up page rendering --><script defer src="https://cdn.jsdelivr.net/npm/katex@0.12.0/dist/katex.min.js" integrity="sha384-g7c+Jr9ZivxKLnZTDUhnkOnsh30B4H0rpLUpJ4jAIKs4fnJI+sEnkvrMWph2EDg4" crossorigin="anonymous"></script><!-- To automatically render math in text elements, include the auto-render extension: --><script defer src="https://cdn.jsdelivr.net/npm/katex@0.12.0/dist/contrib/auto-render.min.js" integrity="sha384-mll67QQFJfxn0IYznZYonOWZ644AWYC+Pt2cHqMaRhXVrursRwvLnLaebdGIlYNa" crossorigin="anonymous" onload="renderMathInElement(document.body);"></script><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.1/css/bulma.min.css"><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-eOJMYsd53ii+scO/bJGFsiCZc+5NDVN2yr8+0RDqr0Ql0h+rP48ckxlpbzKgwra6" crossorigin="anonymous"><!-- Global site tag (gtag.js) - Google Analytics --><script async src="https://www.googletagmanager.com/gtag/js?id=G-LHTH9Z17DT"></script><script>window.dataLayer = window.dataLayer || [];function gtag() { dataLayer.push(arguments);}gtag("js", new Date());gtag("config", "G-LHTH9Z17DT");</script></head><body class="bg-dark min-vh-100"><div class="container text-center justify-content-center mt-5"><h1><a href="/" class="text-decoration-none text-light fw-bold">wtf is this</a></h1><center><input class="filter form-control bg-dark mt-4" id="filter" style="display:block!important;" placeholder="Type question to search" /></center>' + data.answers + '</div></body><script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script><script src="/search.js"></script></html>', function (err) {
        if (err) {
            return console.log(err);
        }
    });
}

async function answers(code, socket, fetch, useragent) {
    // Grab quizid
    var checkroom = await fetch("https://game.quizizz.com/play-api/v4/checkRoom", {
        "headers": {
            "accept": "application/json",
            "accept-language": "pl-PL,pl;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/json",
            "experiment-name": "main_main",
            "pragma": "no-cache",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "user-agent": useragent
        },
        "referrer": "https://quizizz.com/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": "{\"roomCode\":\"" + code + "\"}",
        "method": "POST",
        "mode": "cors"
    });

    var checkroomresponse = await checkroom.json();
    if (typeof checkroomresponse.error !== "undefined" && checkroomresponse.error.type == "room.NOT_FOUND") {
        socket.emit('error', "Invalid quizizz code.");
    } else {
        var quizid = checkroomresponse.room.quizId;
        socket.emit('logs', 'Connected to room');
        // Start flashcards to grab roomhash and questions list
        var solojoin = await fetch("https://game.quizizz.com/play-api/v4/soloJoin", {
            "headers": {
                "accept": "application/json",
                "accept-language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
                "content-type": "application/json",
                "experiment-name": "main_main",
                "sec-ch-ua": "\"Google Chrome\";v=\"89\", \"Chromium\";v=\"89\", \";Not A Brand\";v=\"99\"",
                "user-agent": useragent
            },
            "referrer": "https://quizizz.com/",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": "{\"quizId\":\"" + quizid + "\",\"player\":{\"id\":\"me\",\"origin\":\"web\",\"isGoogleAuth\":true,\"avatarId\":null,\"startSource\":\"replay|summary|btn\",\"name\":\"Sandra Sandra\",\"mongoId\":\"" + checkroomresponse.room.hostId + "\",\"expName\":\"sockUpg_main\",\"expSlot\":\"9\"},\"userId\":\"" + checkroomresponse.room.hostId + "\",\"gameOptions\":{\"jumble\":false,\"jumbleAnswers\":false,\"showAnswers\":true,\"showAnswers_2\":\"always\",\"studentQuizReview\":true,\"studentQuizReview_2\":\"yes\",\"studentLeaderboard\":false,\"memes\":false,\"timer\":true,\"memeset\":\"default\",\"studentMusic\":true,\"loginRequired\":false,\"limitAttempts\":0,\"redemption\":\"no\",\"nicknameGenerator\":false,\"mirror\":false,\"powerups\":\"no\",\"questionsPerAttempt\":0,\"timer_3\":\"classic\"},\"gameType\":\"flashcard\",\"powerupInternalVersion\":\"12\",\"slot\":9,\"experiment\":\"sockUpg_main\",\"locale\":\"pl\"}",
            "method": "POST",
            "mode": "cors"
        });

        var solojoinresponse = await solojoin.json();
        var roomhash = solojoinresponse.data.room.hash;
        var questions = solojoinresponse.data.room.questions;
        // Create local questions list, grab answer for each by procceding flashcards and send it to client with socket
        for (var i in questions) {

            var question = questions[i];
            var questionid = question["_id"];
            var options = question.structure.options;
            var query = "";
            if ((question.structure.query.media).length > 0) {
                for (var media in question.structure.query.media) {
                    query += "<img src='" + question.structure.query.media[media].url + "'>";
                    query += "<p>" + (question.structure.query.text).replace("<p>", "").replace("</p>", "") + "</p>";
                }
            } else {
                query += "<p>" + (question.structure.query.text).replace("<p>", "").replace("</p>", "") + "</p>";
            }
            var type = question.type;

            if (type != "BLANK") {

                var soloproceed = await fetch("https://game.quizizz.com/play-api/v4/soloProceed", {
                    "headers": {
                        "accept": "application/json",
                        "accept-language": "pl-PL,pl;q=0.9",
                        "cache-control": "no-cache",
                        "content-type": "application/json",
                        "experiment-name": "sockUpg_main",
                        "pragma": "no-cache",
                        "user-agent": useragent
                    },
                    "referrer": "https://quizizz.com/",
                    "referrerPolicy": "strict-origin-when-cross-origin",
                    "body": "{\"roomHash\":\"" + roomhash + "\",\"playerId\":\"me\",\"response\":{\"attempt\":0,\"questionId\":\"" + questionid + "\",\"questionType\":\"" + type + "\",\"response\":[],\"responseType\":\"original\",\"timeTaken\":179707,\"isEvaluated\":false,\"provisional\":{\"scores\":{\"correct\":600,\"incorrect\":0},\"scoreBreakups\":{\"correct\":{\"base\":600,\"timer\":0,\"streak\":0,\"powerups\":[],\"total\":600},\"incorrect\":{\"base\":0,\"timer\":0,\"streak\":0,\"powerups\":[],\"total\":0}},\"teamAdjustments\":[]}},\"questionId\":\"" + questionid + "\",\"powerupEffects\":{\"destroy\":[]},\"gameType\":\"solo\"}",
                    "method": "POST",
                    "mode": "cors"
                });
            } else {
                var soloproceed = await fetch("https://game.quizizz.com/play-api/v4/soloProceed", {
                    "headers": {
                        "accept": "application/json",
                        "accept-language": "pl-PL,pl;q=0.9",
                        "cache-control": "no-cache",
                        "content-type": "application/json",
                        "experiment-name": "sockUpg_main",
                        "pragma": "no-cache",
                        "user-agent": useragent
                    },
                    "referrer": "https://quizizz.com/",
                    "referrerPolicy": "strict-origin-when-cross-origin",
                    "body": "{\"roomHash\":\"" + roomhash + "\",\"playerId\":\"me\",\"response\":{\"attempt\":0,\"questionId\":\"" + questionid + "\",\"questionType\":\"" + type + "\",\"response\":\"\",\"responseType\":\"original\",\"timeTaken\":179707,\"isEvaluated\":false,\"provisional\":{\"scores\":{\"correct\":600,\"incorrect\":0},\"scoreBreakups\":{\"correct\":{\"base\":600,\"timer\":0,\"streak\":0,\"powerups\":[],\"total\":600},\"incorrect\":{\"base\":0,\"timer\":0,\"streak\":0,\"powerups\":[],\"total\":0}},\"teamAdjustments\":[]}},\"questionId\":\"" + questionid + "\",\"powerupEffects\":{\"destroy\":[]},\"gameType\":\"solo\"}",
                    "method": "POST",
                    "mode": "cors"
                });
            }
            var soloproceedresponse = await soloproceed.json();
            if (type != "BLANK") {
                var answerid = soloproceedresponse.data.question.structure.answer;
            } else {
                var answerid = soloproceedresponse.data.question.structure.options;
            }
            if (answerid.length > 1) {
                // Multiple answer question
                var multiple = "";
                for (var a in answerid) {
                    if (type != "BLANK") {
                        multiple += (options[a].text).replace("<p>", "").replace("</p>", "") + "<span style='color:red!important;'>,</span> ";
                    } else {
                        multiple += (answerid[a].text).replace("<p>", "").replace("</p>", "") + "<span style='color:red!important;'>,</span> ";
                    }
                }
                socket.emit('answers', '<div class="card bg-dark text-light mb-4"><div class="card-body"><div class="card-title">' + query + '</div><div class="card-text">' + multiple.replace(/,(?=[^,]*$)/, '') + '</div></div></div>');
            } else {
                // Single answer question
                if (type != "BLANK") {
                    socket.emit('answers', '<div class="card bg-dark text-light mb-4"><div class="card-body"><div class="card-title">' + query + '</div><div class="card-text">' + (options[answerid].text).replace("<p>", "").replace("</p>", "") + '</div></div></div>');
                } else {
                    socket.emit('answers', '<div class="card bg-dark text-light mb-4"><div class="card-body"><div class="card-title">' + query + '</div><div class="card-text">' + (answerid[0].text).replace("<p>", "").replace("</p>", "") + '</div></div></div>');
                }
            }
        }
        socket.emit('logs', 'end');
    }
}
