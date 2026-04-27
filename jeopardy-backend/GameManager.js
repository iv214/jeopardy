class GameManager {
    constructor(io) {
        this.games = new Map()
        this.io = io
    }
    createGame(room, creator, options={}) {
        const game = {
            creator: creator,
            players: [],
            scores: new Map(),
            options: options,
            gamestate: {
                started: false,
            }
        }
        this.games.set(room, game)
        return game;
    }
    joinGame(room, player) {

    }

    broadcastGame(room) {
        if (typeof room !== "string") return;

    }

    closeGame(room)
    {
        if (typeof room !== "string") return;
        this.io.socketsLeave(room);
    }
    deleteGame(room) {
        if (typeof room !== "string") return;
        if (this.games.delete(room)) {
            console.log(`deleted empty game ${room}`);
        }
    }
}
module.exports = GameManager