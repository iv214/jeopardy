class GameManager {
    constructor(io) {
        this.games = new Map()
        this.io = io
    }
    createGame(organizer, options) {
        const game = {
            id: this.games.length(),
            organizer: organizer,
            players: [],
            scores: new Map(),
            options: options,
            gamestate: {
                
            }
        }
        
        this.games.push(game)
        return game;
    }
    joinGame(gameid, player) {

    }

    closeGame(gameid)
    {
        this.io.socketsLeave("gameid")
        
    }
}
module.exports = GameManager