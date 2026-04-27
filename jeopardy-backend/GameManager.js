class GameManager {
    constructor(io) {
        this.games = new Map()
        this.io = io
    }

    // Game management

    createGame(room, creator, options={}) {
        const verifiedOptions = this.verifyOptions(options)
        const game = {
            creator: creator,
            players: new Map(),
            options: verifiedOptions,
            gamestate: {
                started: false,
            }
        }
        this.games.set(room, game)
        return game;
    }
    
    closeGame(room)
    {
        if (typeof room !== "string") return false;
        this.io.socketsLeave(room);
        return true;
    }
    deleteGame(room) {
        if (typeof room !== "string") return false;
        return this.games.delete(room);
    }

    // Player management

    addPlayer(room, uuid, name) {
        if (typeof room !== "string" || typeof uuid !== "string" || typeof name !== "string") return false;
        const game = this.games.get(room)
        if (!game) return false;
        if (game.players.has(uuid)) return false;
        if (this.checkIfNameTaken(room, name)) return false;
        game.players.set(uuid, {name: name, score: 0})
        return true;
    }

    checkPlayer(room, uuid) {
        if (typeof room !== "string" || typeof uuid !== "string") return false;
        const game = this.games.get(room)
        if (!game) return false;
        return game.players.has(uuid);
    }

    removePlayer(room, uuid) {
        if (typeof room !== "string" || typeof uuid !== "string") return false;
        const game = this.games.get(room)
        if (!game) return false;
        return game.players.delete(uuid);
    }

    getPlayerData(room, uuid) {
        if (typeof room !== "string" || typeof uuid !== "string") return null;
        const game = this.games.get(room);
        if (!game) return null;
        return game.players.get(uuid);
    }

    getAllPlayerData(room) {
        if (typeof room !== "string") return null;
        const game = this.games.get(room)
        if (!game) return null;
        return game.players.values;
    }

    checkIfNameTaken(room, name) {
        if (typeof room !== "string" || typeof name !== "string") return;
        const game = this.games.get(room)
        if (!game) return null;
        return (Array.from(game.players.values()).some(player => player.name == name))
    }

    verifyOptions(options) {
        return {
            
        }
    }

    broadcastGame(room) {
        if (typeof room !== "string") return;
    }
}
module.exports = GameManager