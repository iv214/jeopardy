const { Server } = require("socket.io");
const { createServer } = require('node:http')
const express = require("express")
const dotenv = require("dotenv").config()
const cors = require("cors");


var environment = process.env.NODE_ENV || "development";
console.log(`Running as ${environment}`);



const app = express()

if (environment === "production") {
    const corsOptions = {
        origin: (origin, callback) => {
            if (!origin || origin !== process.env.PROD_FRONTEND_URL) {
                callback(null, true);
            }
            else {
                callback(new Error("Not allowed by CORS settings"))
            }
        }, credentials: true,
    };
    app.use(cors(corsOptions));    
}

const server = createServer(app)
const io = new Server(server, {cors: {
    origin: environment === "production"
        ? process.env.PROD_FRONTEND_URL
        : process.env.DEV_FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
}});

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
    if (gameManager.deleteGame(room)) console.log(`deleted empty game ${room}`);
});

io.on("connection", (socket) => {
    console.log("user connected", socket.id);
    
    socket.on("message-client", (params, callback) => {
        if (typeof params.message !== 'string' || params.room.length > 255)
        {
            socket.emit("error");
            return;
        }
        io.emit("message-server", {source: socket.id, message: params.message});
    })
    // Room management
    socket.on("leave-room-client", (params, callback) => {
        if (typeof params.room !== "string") return;
        const room = params.room;
        const uuid = params.uuid;
        if (socket.rooms.has(room)) {
            socket.leave(room);
            if (gameManager.closeOnCreatorLeave(room)) {
                socket.emit("kick", {message: "Room got closed"});
                return;
            }
        }
        const playerData = gameManager.getPlayerData(room, uuid)
        if (playerData) {
            gameManager.removePlayer(room, uuid);
        }
        socket.emit("leave-room-success", {message: "Left the room"})
        if (io.sockets.adapter.rooms.has(room))
        {
            if (playerData) {
                socket.to(room).emit("room-action-broadcast", {name: playerData.name, id: socket.id, action: "left"});
            }
        }
    })

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
            if (!gameManager.addPlayer(room, uuid, name, socket.id)) {
                socket.emit("error", {message: "Error while adding a player"});
                return;
            }
            socket.join(room);
            socket.emit("join-room-success", {uuid: uuid, room: room, name: name});
            socket.to(room).emit("room-action-broadcast", {name: name, id: socket.id, action: "joined"})
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
            // though, that should never happen anyways
            return
        }
        if (typeof params.name !== 'string' || params.name.length < 1)
        {
            socket.emit("error", {message: "Invalid player name"});
            return;
        }
        const name = params.name;
        const questionList = params.questionList;
        const room = generateRoomId();
        if (room) {
            // todo: configure room settings here from params
            if (gameManager.createGame(room, socket.id, questionList) === false) {
                socket.emit("error", {message: "Failed to create a game"});
                return;
            }
            const uuid = crypto.randomUUID();
            if (!gameManager.addPlayer(room, uuid, name, socket.id, true)) {
                socket.emit("error", {message: "Error while adding a player"});
                return;
            }
            socket.join(room);
            socket.emit("create-room-success", {uuid: uuid, room: room, name: name});
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
                const playerData = gameManager.getPlayerData(room, uuid);
                const old_socket_id = playerData.socket_id;
                if (io.sockets.sockets.has(old_socket_id)) {
                    socket.emit("kick", {message: "The socket associated with user still exists"});
                    return;
                }
                gameManager.updatePlayerSocket(room, uuid, socket.id)
                const name = playerData.name;
                socket.join(room);
                socket.emit("success", {message: "Reconnected to the room"})
                socket.to(room).emit("room-action-broadcast", {name: name, id: socket.id, action: "rejoined"})
                gameManager.broadcastGame(room);
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

    // Game state update
    socket.on("fetch-gamestate", (params, callback) => {
        if (typeof params.room !== "string") return;
        const room = params.room;
        if (socket.rooms.has(room)) {
            socket.emit("update-gamestate", {stats: gameManager.getAllSafePlayerData(room), gamestate: gameManager.getGamestate(room)})
        }
    })
    // Game commands

    // Organizer
    socket.on("gamestate-change-client", (params, callback) => {
        if (typeof params.uuid !== "string") return;
        if (typeof params.room !== "string") return;
        const uuid = params.uuid;
        const room = params.room;
        if (gameManager.checkIfOrganizer(room, uuid)) {
            const result = gameManager.changeGameState(room, true, params);
            if (result.status === "error")
            {
                socket.emit("error", {"message": result.message})
                //gameManager.broadcastGame(room);
            }
        }
        else {
            socket.emit("error", {"message": "Not an organizer"})
        }
    })

    // Players
    socket.on("board-press-client", (params, callback) => {
        const date = new Date(Date.now())
        if (typeof params.uuid !== "string") return;
        if (typeof params.room !== "string") return;
        const uuid = params.uuid;
        const room = params.room;
        if (gameManager.getStage(room) !== "choice") {
            socket.emit("error", {message: "Not at choice stage"})
            return;
        }
        if (typeof params.rowId !== "number") return;
        if (typeof params.colId !== "number") return;
        
        if (socket.rooms.has(room)) {
            //const playerData = gameManager.getPlayerData(room, uuid);
            if (gameManager.checkIfChoosingPlayer(room, uuid)) {
                const status = gameManager.changeGameState(room, false, params={rowId: params.rowId, colId: params.colId});
                if (status.status === "error") {
                    socket.emit("error", {message: status.message});
                }
            }
            else {
                socket.emit("error", {message: "Not a choosing player"})
            }
        }
        else {
            socket.emit("error", {message: "Not in the room"})
        }
    })

    socket.on("answer-client", (params, callback) => {
        const date = new Date(Date.now())
        if (typeof params.uuid !== "string") return;
        if (typeof params.room !== "string") return;
        if (typeof params.answer !== "string") return;
        const uuid = params.uuid;
        const room = params.room;
        const answer = params.answer;
        if (gameManager.getStage(room) !== "q-answer") {
            socket.emit("error", {message: "Not at answering stage"});
            return;
        }
        if (socket.rooms.has(room)) {
            if (gameManager.checkIfAnsweringPlayer(room, uuid)) {
                const status = gameManager.changeGameState(room, false, params={answer: answer});
                if (status.status === "error") {
                    socket.emit("error", {message: status.message});
                }
            }
            else {
                socket.emit("error", {message: "Not answering"});
            }
        }
        else {
            socket.emit("error", {message: "Not in the room"});
        }
    })


    socket.on("press-client", (params, callback) => {
        const date = new Date(Date.now())
        if (typeof params.uuid !== "string") return;
        if (typeof params.room !== "string") return;
        const uuid = params.uuid;
        const room = params.room;
        if (gameManager.getStage(room) !== "q-waiting") {
            socket.emit("error", {message: "Not at pressing stage"});
            return;
        }
        if (socket.rooms.has(room)) {
            const playerData = gameManager.getPlayerData(room, uuid);
            if (playerData) {
                if (playerData.dq) {
                    socket.emit("error", {message: "You're not a participant"});
                    return;
                }
                const status = gameManager.changeGameState(room, false, params={name: playerData.name});
                if (status.status === "error") {
                    socket.emit("error", {message: status.message});
                }
                else {
                    io.to(params.room).emit("press-server", {name: playerData.name, date: date.toString()});
                }
            }
            else {
                socket.emit("error", {message: "No player data found"});
            }
        }
        else {
            socket.emit("error", {message: "Not in the room"});
        }
    })
    // Chat
    socket.on("chat-message-client", (params, callback) => {
        console.log("received a chat message")
        const date = new Date(Date.now())
        if (typeof params.uuid !== "string") return;
        if (typeof params.room !== "string") return;
        if (typeof params.message !== 'string' || params.message.length > 255) return;
        const uuid = params.uuid;
        const room = params.room;
        const message = params.message.trim();
        if (message.length < 1) return;
        if (socket.rooms.has(room)) {
            const playerData = gameManager.getPlayerData(room, uuid);
            if (playerData) {
                io.to(params.room).emit("chat-message-server", {name: playerData.name, date: date.toString(), message: message});
            }
            else {
                socket.emit("error", {message: ""})
            }
        }
        else {
            socket.emit("error", {message: "Not in the room"})
        }

    });


});


server.listen(port, () => { console.log(`server running at http://localhost:${port}`) });
