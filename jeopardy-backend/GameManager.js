class GameManager {
    constructor(io) {
        this.games = new Map()
        this.io = io
    }
    createGame(room, creator, options={}) {
        const game = {
            creator: creator,
            players: new Map(),
            options: options,
            gamestate: {
                started: false,
            }
        }
        this.games.set(room, game)
        return game;
    }

    addPlayer(room, uuid, name) {
        if (typeof room !== "string") return false;
        if (typeof uuid !== "string") return false;
        if (typeof name !== "string") return false;

        const game = this.games.get(room)
        if (game) {
            if (game.players.has(uuid)) return false;
            if (this.checkIfNameTaken(room, name)) return false;
            game.players.set(uuid, {name: name, score: 0})
            return true;
        }
        return false;
    }

    checkPlayer(room, uuid) {
        if (typeof room !== "string") return false;
        if (typeof uuid !== "string") return false;
        const game = this.games.get(room)
        if (game) {
            return game.players.has(uuid);
        }
    }

    checkIfNameTaken(room, name) {
        if (typeof name !== "string") return;
        const game = this.games.get(room)
        if (game) return (Array.from(game.players.values()).some(player => player.name == name))
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