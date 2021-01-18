const path = require('path');
const http = require('http');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
var randomWords = require('random-words');
var express = require('express');
var bodyparser = require('body-parser');
const router = express.Router();

const e = require('express');
const request = require('request');
// const cheerio = require('cheerio');
require('dotenv').config();
const { google } = require('googleapis');
const { title } = require('process');

//!Testing running python code
// const {spawn} = require('child_process');
// try{
//     const childPython = spawn('python', ['test.py', 'URL!']);
    
//     childPython.stdout.on('data', (data)=>{
//         console.log(`stdout: ${data}`);
//     });
//     childPython.stderr.on('data', (data)=>{
//         console.error(`stderr: ${data}`);
//     });
//     childPython.on('data', (data)=>{
//         console.log(`child ended with code: ${data}`);
//     });
// } catch(error) {
//     console.log("PYTHON ERROR: "+error);
// }

const fs = require('fs')
const youtubedl = require('youtube-dl')

// const video = youtubedl('past_url_here')
// const url = `https://vimeo.com/122957`;

// const options = [];
// try{
//     youtubedl.getInfo(url, options, function(err, info) {
//         if (err) throw err
//         console.log('id:', info.id)
//         console.log('title:', info.title)
//         console.log('url:', info.url)
//         console.log('thumbnail:', info.thumbnail)
//         console.log('description:', info.description)
//         console.log('filename:', info._filename)
//         console.log('format id:', info.format_id)
//     });
// } catch(err){
//     console.log('==============');
//     console.log("Couldn't get vid info: "+err);
//     console.log('==============');
// }
// Will be called when the download starts.
// video.on('info', function(info) {
//   console.log('Download started');
//   console.log('filename: ' + info._filename);
//   console.log('size: ' + info.size);
// })
// video.pipe(fs.createWriteStream('myvideo.mp4'));
// // Will be called if download was already completed and there is nothing more to download.
// video.on('complete', function complete(info) {
//     'use strict';
//     console.log('filename: ' + info._filename + ' already downloaded.');
// });
// video.on('end', function() {
//     console.log('finished downloading!')
// });

const expressLayouts = require('express-ejs-layouts');

const RoomModel = require('./models/room');

const {v4: uuidV4} = require('uuid');
const isUuid = require('isuuid');

const socketio = require('socket.io');

var jsonParser = bodyparser.json();
// var urlencodedParser = bodyparser.urlencoded({ extended: false });

const mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);

var app = express();

require('./config/passport')(passport);
const server = http.createServer(app);

// let rooms = [];
const dbURI = 'mongodb+srv://'+process.env.DB_USERNAME+':'+process.env.DB_PASS+'@cluster0.agmjg.mongodb.net/'+process.env.DB_NAME+'?retryWrites=true&w=majority';
mongoose.connect(dbURI, {useNewUrlParser: true, useUnifiedTopology: true})
    .then((result)=>{
        server.listen(port, function(){
            // RoomModel.find().then((result)=>{
            //     // rooms = result;
            // }).catch((err)=>{
            //     console.log(`Failed to get rooms from DB\n${err}`);
            // });
            console.log('Connected to DB...');
            console.log(`Server listening on: ${port}`);
            console.log("Server start date/time: "+new Date().toLocaleDateString() + " / " + new Date().toLocaleTimeString());
            console.log("======");
        });
    }).catch(err=>console.log(err));

// app.use(expressLayouts);
app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true
  }));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use((req, res, next)=>{
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

app.use('/', require('./routes/index'));
app.use('/user', require('./routes/user'));
app.use(router);
// app.use(bodyparser.json());
// app.use(bodyparser.urlencoded({extended: true}));

const io = socketio(server);

//let rawData = fs.readFileSync('messages.json');

function getAllRooms(){
    return RoomModel.find();
}

function joinRoom(socket, userData, roomID){
    findRoom(roomID)
    .then(currRoom=>{
        socket.join(roomID);
        if(currRoom){
            console.log("Joining a pre-existing room.");
            addToRoom(socket.id, userData, currRoom);
        } else {
            //THis code will basically never run,
            //because we call createEmptyRoom when people
            //take the route to even get here.
            console.log("Creating a new room.");            
            createNewRoom(socket.id, userData, roomID);
        }
    })
    .catch(err=>logFailure('join room', err));
}

function logFailure(goal, error){
    console.log(`Failed to ${goal} becuase: \n${error}`);
}

function addToRoom(socketID, userData, currRoom){    
    const { localName, nameOnServer, userID, pfp } = userData;
    // findRoom(roomID)
    // .then(currRoom=>{
        let isHost = false;
        if(currRoom.users.length < 1 || !currRoom.hostSocketID){
            //if this user is the only one in the room, make them host
            isHost = true;
            currRoom.hostSocketID = socketID;
        } else {
            // If we're not the host, request state from the host.
            console.log(`Trying to get state from host (${
                currRoom.hostSocketID})`);
            io.to(currRoom.hostSocketID).emit('requestState',
                socketID);
        }
        
        currRoom.users.push({
            socketID, localName, nameOnServer, userID, isHost, pfp
        });

        RoomModel.updateOne(
            {roomID: currRoom.roomID},
            {$set: {
                users: currRoom.users,
                hostSocketID: currRoom.hostSocketID
            }}
        )
        .catch(err=>{
            logFailure('add to room', err);
        });
        // updateRoomUsers(currRoom.users, currRoom.roomID)
    // })
    // .catch(err=>{
    //     logFailure(`find room ${roomID}`, err);
    // });
    // RoomModel.updateOne(
    //     {roomID: currRoom.roomID}, //query for the room to update
    //     {$set: {users: currRoom.users}} //value to update
    // );    
    //Update room in DB.
    // console.log(` ${JSON.stringify(currRoom, null, 2)}`);
}

class RoomSecurity{
    static OPEN = 0;
    static LOCKED = 1;
    static PRIVATE = 2;
}

const defaultDescription = "A lovely room for watching videos! Join!";
const defaultThumbnail = "https://i.ytimg.com/vi/l-7--PSbfbI/maxresdefault.jpg";
const defaultSecuritySetting = RoomSecurity.OPEN;

async function createEmptyRoom(securitySetting, roomName,
                                roomDescription, roomID
    ){
    if(!roomName){
        roomName = randomWords();
    }
    if(!roomDescription){
        roomDescription = defaultDescription;
    }
    const newRoom = await RoomModel.create({
        roomID: roomName+'-'+roomID,
        hostSocketID: "",
        roomName,
        roomDescription,
        history: [],
        nsfw: false,
        securitySetting,
        thumbnail: defaultThumbnail,
        users: [],
        videoTitle: "",
        videoSource: 4,
        videoID: "", //holds id most recently played video
        videoTime: 0, //most recent video time,
        videoState: CustomStates.UNSTARTED,//most recent state
        playRate: 1,
        messages: []
    });
    // rooms.push(newRoom);
    console.log(`Room created:\n${newRoom}`);
    // console.log("empty room created");
    // return newRoom;
    // return new RoomModel(newRoom).save();
    return newRoom.save();
    // .catch(err=>logFailure(`creat empty room from ${roomID}`, err));
}

async function createNewRoom(socketID, userData, roomID){
    const { localName, nameOnServer, userID, pfp } = userData;
    const randomName = randomWords();
    const thisRoom = await RoomModel.create({
        roomID: randomName+'-'+roomID,
        roomName: randomName,
        roomDescription: defaultDescription,
        history: [],
        nsfw: false,
        securitySetting: defaultSecuritySetting,
        thumbnail: defaultThumbnail,
        hostSocketID: socketID,
        users: [{
            socketID, localName, nameOnServer, userID, isHost: true, pfp
        }],
        videoID: "", //holds id most recently played video
        videoTime: 0, //most recent video time,
        videoState: CustomStates.UNSTARTED,//most recent state
        videoDuration: 0,
        playRate: 1,
        messages: [
                    {
                        mID: 0,
                        mContent: "Welcome to the room!",
                        mUserID: "SERVER",
                        mlocalName: "SERVER",
                        mlocalTimeStamp: "",
                        mUniversalTimeStamp: ""
                    }
                ]
        })
    // new RoomModel(thisRoom).save()
    thisRoom.save()
    .catch(err=>logFailure(`create new Room at ${roomID}`, err));
        // console.log(`Just joined ${JSON.stringify(thisRoom, null, 2)}`);
    // return thisRoom;
}

function updateRoomUsers(users, roomID){
    return RoomModel.updateOne(
        {roomID: roomID}, //query for the room to update
        {$set: {users: users}} //value to update
    );
}

function changeRoomName(roomName, roomID){
    const foundRoom = findRoom(roomID);
    RoomModel.updateOne(
        {roomID}, //query for the room to update
        {$set: {roomName, roomID: roomName+'-'+roomID}} //value to update
    ).then((result)=>{
        // foundRoom.roomName = result.roomName;
        // foundRoom.roomID = result.roomID;
    }).catch((err)=>logFailure(`change room name at ${roomID}`, err));
}

function getRoomHostSocketID(roomID){
    return findRoom(roomID);
}

function removeFromRoom(socket){
    // RoomModel.findOne({$text: {$search: socket.id}})
    RoomModel.find({users:{$not:{$eq:null}}})
    .then(rooms=>{
        // console.log(result);
        const foundRoom = rooms.find(room=>room.users.some(user=>user.socketID == socket.id));
        if(foundRoom){
            // const {users} = foundRoom;
            // const thisUser = result.users
            //             .find(user=>user.socketID == socket.id);
            
            console.log("USER SHOULD BE OUT OF ROOM NOW");
            socket.leave(foundRoom.roomID); 
            foundRoom.users = foundRoom.users
                        .filter(user=>user.socketID != socket.id);
            
            if(foundRoom.users.length < 1){
                foundRoom.hostSocketID = "";
            } else if(foundRoom.hostSocketID == socket.id){
                foundRoom.hostSocketID = foundRoom.users[
                    Math.floor(Math.random() * foundRoom.users.length)
                ].socketID;
            }
            RoomModel.updateOne(
                {roomID: foundRoom.roomID}, //query for the room to update
                {$set: {
                    users: foundRoom.users,
                    hostSocketID: foundRoom.hostSocketID
                    }
                } //value to update
            )
            .catch(err=>logFailure(`delete user ${socket.id}`, err));
            // updateRoomUsers(foundRoom.users, foundRoom.roomID)
        }
    });
}

function checkIfHost(roomID, socketID){
    return getRoomHostSocketID(roomID) == socketID;
}

function findRoom(roomID){
    return RoomModel.findOne({roomID});
    // .then((result)=>{
    //     return result;
    // }).catch((err=>{
    //     return undefined;
    // }));
    // return rooms.find(room=>{return room.roomID == roomID});    
}

function updateRoomState(data, roomID, newState){
    // const currRoom = findRoom(roomID);
    const {videoSource, videoTitle,
           videoTime, videoID, playRate,
           thumbnail, videoDuration} = data;
    RoomModel.findOne({roomID})
    .then(room=>{
        let history = room.history;
        if(!history){
            history = [];
        }

        if(!history.some(item=>{return item.videoID == videoID})){
            //if the history doesn't contain this new video,
            //add it to the history.
            history.push({
                videoSource, videoTitle, videoTime, videoID, thumbnail
            });
        } else {
            history.find(item=>{return item.videoID == videoID})
            .videoTime = videoTime;
        }
        console.log('======');
        console.log(`Room history is now:`);
        console.log(JSON.stringify(history, null, 2));
        console.log('======');

        RoomModel.updateOne(
            {roomID}, //query for the room to update
            {$set: {
                videoTime,
                videoSource,
                videoID,
                playRate,
                thumbnail,
                videoTitle,
                videoDuration: videoDuration ? videoDuration : 0,
                history
            }} //value to update
        ).then(result=>{
            //This returns the room prior to the update
        });
    })
    .catch((err)=>{
        //I assume for now that if there's an error, the room doesn't exist.                
        console.log(`Failed to update room state\n${err}`);
        //should probably make a function like logFailure('update room state', err);
    });
    // .then((result)=>{})
}

const listRoomID = "LISTROOM";

io.on('connection', socket=>{

    socket.on('joinRoom', (userData, roomID)=>{
        joinRoom(socket, userData, roomID);
    });

    socket.on('setLooping', (loopValue, roomID)=>{
        socket.to(roomID).broadcast.emit('setLooping', loopValue);
    })

    socket.on('joinListRoom', _=>{
        socket.join(listRoomID);
    });

    socket.on('refreshRequest', _=>{
        const data = {
            rooms
        };
        io.to(socket.id).emit('refreshResponse', data);
    });

    socket.on('joinChat', (userData, room)=>{
        // socket.to(room).broadcast.emit('chatJoined', `${userData.name} has joined the chat!`);
    });

    socket.on('sendState', (data)=>{
        io.to(data.requesterSocketID).emit('initPlayer', data);
        console.log(`STATE SENT TO ${data.requesterSocketID}`);
    });

    socket.on('playrateChange', (playRate, roomID)=>{
            //No need to update DB every time the playrate changes.
            //Just wait until the host presses play/pause.    
        socket.to(roomID).broadcast.emit('playrateChange', playRate);
    });

    socket.on('play', (data, roomID)=>{
        // const isHost = checkIfHost(roomID, socket.id);
        findRoom(roomID)
        .then(({hostSocketID})=>{
            const isHost = hostSocketID == socket.id
            // if(isHost){
                updateRoomState(data, roomID, CustomStates.PLAYING)
            // }
            socket.to(roomID).broadcast.emit('play', {
                state: CustomStates.PLAYING,
                isHost,
                videoTime: data.videoTime
            });
        });
    });

    socket.on('pause', (data, roomID)=>{
        findRoom(roomID)
        .then(({hostSocketID})=>{
            const isHost = hostSocketID == socket.id
            // if(isHost){
                updateRoomState(data, roomID, CustomStates.PAUSED)
            // }
            socket.to(roomID).broadcast.emit('pause', {
                state: CustomStates.PAUSED,
                isHost,
                videoTime: data.videoTime
            });
        });
    });

    socket.on('playPause', (data, roomID)=>{
        findRoom(roomID)
        .then(({hostSocketID})=>{
            const isHost = hostSocketID == socket.id
            if(isHost){
                updateRoomState(data, roomID, data.videoState)
            }
            socket.to(roomID).broadcast.emit('playPause', {
                videoState: data.videoState,
                isHost,
                videoTime: data.videoTime
            });
        });
    });

    socket.on('seek', (videoTime, roomID)=>{
        socket.to(roomID).broadcast.emit('seek', videoTime);
    });

    socket.on('sync', roomID=>{
        findRoom(roomID)
        .then(room=>{
            const data = {
                state: room.videoState,
                videoID: room.videoID,
                startTime: room.videoTime,
                playRate: room.playRate
            }
            io.to(roomID).emit('initPlayer', data);

        });
    });

    socket.on('message', (letterArray, roomID)=>{
        console.log(letterArray);
    });

    socket.on('startOver', (roomID)=>{
        socket.to(roomID).broadcast.emit('startOver', 0);
    });

    socket.on('startNew', (data, roomID)=>{
        updateRoomState(data, roomID, CustomStates.PAUSED);
        data.roomID = roomID;        
        socket.to(roomID).broadcast.emit('startNew', data);
    });

    socket.on('disconnect', _=>{
        console.log("DISCONNECTING!!");
        removeFromRoom(socket);
    });
});

var port = process.env.PORT || 8092;

app.post('/check-saved-roomID', (req, res)=>{
    console.log("GET FIRED");
    const shouldRedirect = isUuid(req.body.currRoomID) && findRoom(req.body.storedRoomID);
    res.send(shouldRedirect);
});

app.get('/room/:roomID', (req, res)=>{
    // const currRoomID = req.params.roomID;
    // console.log(`ID IS ${currRoomID}`);
    findRoom(req.params.roomID)
    .then(room=>{
        if(room){
            res.render('room', {roomID: room.roomID});
        } else {
            console.log("Someone tried to enter a room that didn't exist.");
            res.render('homepage');
        }
    })
    .catch(err=>{
        console.log(err);
        res.redirect('/');
    });
});

app.post('/create-new-room', (req, res)=>{
    const {securitySetting, roomDescription} = req.body;
    let {roomName} = req.body;
    let securityResult = RoomSecurity.PRIVATE;
    switch(securitySetting){
        case "open":
            securityResult = RoomSecurity.OPEN;
            break;
        case "locked":
            securityResult = RoomSecurity.LOCKED;
            break;
        case "private":
            securityResult = RoomSecurity.PRIVATE;
            break;
    }
    if(roomName.includes(' ')){
        roomName = roomName.split(' ').join('');
    }

    if(roomName.length > 50){
        roomName = roomName.substring(0, 50);
    }

    const rawID = uuidV4();
    console.log("SECURITY SETTING: "+securitySetting+`(${securityResult})`);
    createEmptyRoom(securityResult, roomName, roomDescription, rawID)
    .then(({roomID})=>{
        res.redirect(`/room/${roomID}`);
    });
});

class CustomStates{
    static UNSTARTED = -1;
    static ENDED = 0;
    static PLAYING = 1;
    static PAUSED = 2;
    static BUFFERING = 3;
    static CUED = 5;
    //Below are my custom values
    static SEEKING = 6;
}

class YouTubeSearchManager{
    static searchResults = [];
}

app.post('/get-rooms-list', (req, res)=>{
    getAllRooms()
    .then(rooms=>{
        res.send({rooms});
    })
    .catch(error=>{
        logFailure()
        res.render('error', {error});//Show error page
    });
});

app.post('/search', function(req, response){
    // console.log(`${new Date().toLocaleTimeString()} Searching for: ${JSON.stringify(req.body, null, 2)}`);
    // console.log('===================================');    
    google.youtube('v3').search.list({
        key: process.env.YOUTUBE_TOKEN,
        part: "snippet",
        q: req.body.query,
        maxResults: 20
    }).then(({ data })=>{
        const searchData = [];
        data.items.forEach((item)=>{
            if(item.id.kind == "youtube#video"){
                const {snippet} = item;
                searchData.push({
                    title: snippet.title,
                    description: snippet.description,
                    published: snippet.publishedAt,
                    thumbnail: snippet.thumbnails['high'].url,
                    videoID: item.id.videoId
                });
            }
        });
        response.send(searchData);
        // YouTubeSearchManager.searchResults[req.body.user_id] = searchData;
    })
    .catch(e=>console.log(e));
    // res.send(YouTubeSearchManager.searchResults[req.body.user_id]);
});

app.post('/get-search-results', function(req, res){
    
    const results = YouTubeSearchManager.searchResults[req.body.user_id];
    if(results){
        // results.forEach(result=>console.log(`${new Date().toLocaleTimeString()} Result is: ${JSON.stringify(result, null, 2)}`));
        YouTubeSearchManager.searchResults[req.body.user_id] = null;
    }// if(results) YouTubeSearchManager.searchResults[req.body.user_id] = null;

    res.send(results);
});