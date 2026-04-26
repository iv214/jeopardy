const { Server } = require("socket.io");
const { createServer } = require('node:http')
const express = require("express")

const app = express()
const server = createServer(app)
const io = new Server(server, {cors: { origin: "http://localhost:5173" }});

const GameManager = require('./GameManager')
const gameManager = new GameManager(io);

const port = 3000;



app.get("/", (req, res) => { res.send('<h1>Hello world</h1>') });

app.get("/api/gamelist", (req, res) => {});

io.use((socket, next) => {
    var handshake = socket.request;
    next();
});

io.on("connection", (socket) => {
    console.log("user connected", socket.id);
    socket.on("press-client", (params, callback) => {
        console.log("received a press")
        const date = new Date(Date.now())
        io.emit("press-server", date.toString());
    })
    socket.on("press-client-menu", (params, callback) => {
        console.log("received a press")
        const date = new Date(Date.now())
        io.emit("press-server", "From menu: "+ date.toString());
    })
    socket.on("message-client", (params, callback) => {
        if (typeof params.message !== 'string' || params.room.length > 255)
        {
            socket.emit("error");
            return;
        }
        io.emit("message-server", socket.id, params.message);
    })
    socket.on("join-room-client", (params, callback) => {
        if (typeof params.room !== 'string' || params.room.length > 20)
        {
            socket.emit("error");
            return;
        }
        if (io.sockets.adapter.rooms.has(params.room))
        {
            socket.join(params.room);
            socket.to(params.room).emit("join-room-server", socket.id)
        }
        const date = new Date(Date.now())
        socket.emit("press-server", date.toString());
    })
    
    
});


server.listen(port, () => { console.log(`server running at http://localhost:${port}`) });
