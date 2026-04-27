const { Server } = require("socket.io");
const { createServer } = require('node:http')
const express = require("express")

const app = express()
const server = createServer(app)
const io = new Server(server, {cors: { origin: "http://localhost:5173" }});

const GameManager = require('./GameManager')
const gameManager = new GameManager(io);

const port = 3000;

function generateRoomId(length=8, attempts=3) {
    const MAX_LENGTH = 16;
    for (let counter = 0; counter < attempts; counter++) {
        const room = Math.random().toString(36).substring(2, 2+Math.min(Math.max(length, 0), MAX_LENGTH));
        console.log(room)
        if (!io.sockets.adapter.rooms.has(room)) {
            return room;
        }
    }
    return null;
}

app.get("/", (req, res) => { res.send('<h1>Hello world</h1>') });

app.get("/api/gamelist", (req, res) => {});

io.use((socket, next) => {
    var handshake = socket.request;
    next();
});

io.of("/").adapter.on("delete-room", (room) => {
    gameManager.deleteGame(room);
});

io.on("connection", (socket) => {
    console.log("user connected", socket.id);
    socket.on("press-client", (params, callback) => {
        console.log("received a press")
        const date = new Date(Date.now())
        if (typeof params.room !== "string") return;
        if (socket.rooms.has(params.room)) {
            io.to(params.room).emit("press-server", date.toString());
        }
        else {
            socket.emit("error", {message: "Not in the room"})
        }
    })
    socket.on("message-client", (params, callback) => {
        if (typeof params.message !== 'string' || params.room.length > 255)
        {
            socket.emit("error");
            return;
        }
        io.emit("message-server", {source: socket.id, message: params.message});
    })
    // Room management
    socket.on("join-room-client", (params, callback) => {
        if (typeof params.room !== 'string' || params.room.length > 20)
        {
            socket.emit("error", {message: "Invalid lobby code"});
            return;
        }
        if (typeof params.name !== 'string' || params.name.length < 1)
        {
            socket.emit("error", {message: "Invalid player name"});
            return;
        }
        const room = params.room;
        if (io.sockets.adapter.rooms.has(room))
        {
            const name = params.name;
            if (gameManager.checkIfNameTaken(room, name)) {
                socket.emit("error", {message: "Name already taken"});
                return;
            }
            const uuid = crypto.randomUUID();
            if (!gameManager.addPlayer(room, uuid, name)) {
                socket.emit("error", {message: "Error while adding a player"});
                return;
            }
            socket.join(room);
            socket.emit("join-success", {uuid: uuid, room: room});
            socket.to(room).emit("join-broadcast", {name: name, id: socket.id})
        }
        else {
            socket.emit("error", {message: "Room not found"});
        }
        
    })
    socket.on("create-room-client", (params, callback) => {
        if (socket.rooms.size > 1)
        {
            socket.emit("error", {message: "Already in an existing room"});
            // todo: should ask whether the user wants to leave or reconnect the room
            return
        }
        if (typeof params.name !== 'string' || params.name.length < 1)
        {
            socket.emit("error", {message: "Invalid player name"});
            return;
        }
        const name = params.name;
        const room = generateRoomId();
        if (room) {
            // todo: configure room settings here from params
            gameManager.createGame(room, socket.id);
            const uuid = crypto.randomUUID();
            if (!gameManager.addPlayer(room, uuid, name)) {
                socket.emit("error", {message: "Error while adding a player"});
                return;
            }
            socket.join(room);
            socket.emit("create-success", {uuid: uuid, room: room});
        }
        else {
            socket.emit("error", {message: "Exceeded max room id generation attempts"});
        }
    })
    socket.on("rejoin-room-client", (params, callback) => {
        if (typeof params.room !== "string") return;
        if (typeof params.uuid !== "string") return;
        const room = params.room;
        const uuid = params.uuid;
        if (socket.rooms.has(room)) return; // No need to rejoin
        if (io.sockets.adapter.rooms.has(room)) {
            if (gameManager.checkPlayer(room, uuid)) {
                socket.join(room);
                socket.emit("success", {message: "Reconnected to the room"})
            }
            else {
                socket.emit("kick", {message: "Player is not in the room"});
            }
        }
        else
        {
            socket.emit("kick", {message: "Room doesn't exist"});
        }
    })
    // Game commands



});


server.listen(port, () => { console.log(`server running at http://localhost:${port}`) });
