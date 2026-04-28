class GameManager {
    constructor(io) {
        this.games = new Map()
        this.io = io
    }

    // Game management

    createGame(room, creator, questionList, options={}) {
        
        const cb = this.createBoard(questionList);
        if (cb === null) return false;
        //console.log("Checked board,", (cb !== null))
        const verifiedOptions = this.verifyOptions(options)
        const game = {
            creator: creator,
            players: new Map(),
            options: verifiedOptions,
            gamestate: {
                stage: "",
                categories: cb.categories,
                ptColumns: cb.points,
                boardstate: cb.boardstate,
                playerOrder: null,
                choosingPlayer: null,
                answeringPlayer: null,
                currentQuestion: "",
                currentPlayerAnswer: "",
                points: 0,
                questionsRemaining: cb.questionCounter,
            },
            board: cb.board,
            currentAnswer: null,
        }
        
        
        this.games.set(room, game)
        return game;
    }

    createBoard(questionList, categoryLimit = 8, pointvalsLimit = 8) {
        if (!Array.isArray(questionList)) return null;
        let filteredQList = [];
        questionList.forEach(element => {
            if (typeof element !== "object" || element === null) return;
            if (typeof element.category !== "string" || typeof element.points !== "number" || typeof element.question !== "string"
                || typeof element.answer !== "string") return;
            filteredQList.push({category: element.category, points: element.points, question: element.question, answer: element.answer});
        });
        const categories = [...new Set(filteredQList.map(element => element.category))]
        const points = [...new Set(filteredQList.map(element => element.points))].sort()

        if ((categories.length > categoryLimit) || (points.length > pointvalsLimit)) return null;
        
        const keytable = new Map();
        for (const element of filteredQList) {
            const key = `${element.category},${element.points}`;
            if (!keytable.has(key)) keytable.set(key, element)
        }
        let questionCounter = 0;
        let boardstate = [];
        const board = categories.map(category => 
            points.map(pointval => {
                const key = `${category},${pointval}`;
                if (keytable.get(key)) {
                    questionCounter++;
                     
                    return keytable.get(key)
                }
                else {
                    boardstate.push({row: categories.indexOf(category), column: points.indexOf(pointval)})
                    return null;
                }
            })
        );
        return {categories: categories, points: points, board: board, boardstate: boardstate, questionCounter: questionCounter};
    }


    
    closeOnCreatorLeave(room) {
        const game = this.games.get(room)
        if (!game) return false;
        if (!this.io.sockets.sockets.has(game.creator)) {
            this.closeGame(room)
            return true
        }
        const rooms = game.creator.rooms;
        if (!rooms) {
            this.closeGame(room)
            return true
        }
        if (!rooms.has(room)) {
            this.closeGame(room)
            return true
        }
        return false;
    }

    closeGame(room)
    {
        if (typeof room !== "string") return false;
        this.io.to(room).emit("kick", {message: "Room got closed"});
        this.io.socketsLeave(room);
        return true;
    }
    deleteGame(room) {
        if (typeof room !== "string") return false;
        return this.games.delete(room);
    }

    // Player management

    addPlayer(room, uuid, name, socket_id="", organizer=false) {
        if (typeof room !== "string" || typeof uuid !== "string" || typeof name !== "string" || typeof socket_id !== "string")
            return false;
        const game = this.games.get(room)
        if (!game) return false;
        if (game.players.has(uuid)) return false;
        if (this.checkIfNameTaken(room, name)) return false;
        game.players.set(uuid, {name: name, score: 0, socket_id: socket_id, organizer: organizer, dq: organizer})
        return true;
    }

    updatePlayerSocket(room, uuid, socket_id) {
        if (typeof room !== "string" || typeof uuid !== "string" || typeof socket_id !== "string") return false;
        const game = this.games.get(room)
        if (!game) return false;
        this.getPlayerData(room, uuid).socket_id = socket_id;
    }

    checkIfChoosingPlayer(room, uuid) {
        if (typeof room !== "string" || typeof uuid !== "string") return false;
        const game = this.games.get(room);
        if (!game) return false;
        const name = this.getPlayerData(room, uuid).name;
        if (typeof name !== "string") return false;
        return game.gamestate.choosingPlayer === name;
    }

    checkIfAnsweringPlayer(room, uuid) {
        if (typeof room !== "string" || typeof uuid !== "string") return false;
        const game = this.games.get(room);
        if (!game) return false;
        const name = this.getPlayerData(room, uuid).name;
        if (typeof name !== "string") return false;
        return game.gamestate.answeringPlayer === name;
    }

    checkPlayer(room, uuid) {
        if (typeof room !== "string" || typeof uuid !== "string") return false;
        const game = this.games.get(room)
        if (!game) return false;
        return game.players.has(uuid);
    }

    checkIfOrganizer(room, uuid) {
        const playerData = this.getPlayerData(room, uuid);
        if (!playerData) return false
        return (playerData.organizer === true);
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

    getAllSafePlayerData(room) {
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

    getGamestate(room) {
        if (typeof room !== "string") return;
        const game = this.games.get(room)
        if (!game) return null;
        return game.gamestate;
    }

    broadcastGame(room) {
        this.io.to(room).emit("update-gamestate", {stats: this.getAllSafePlayerData(room), gamestate: this.getGamestate(room)})
    }


    gameSetup(room) {
        if (typeof room !== "string") return;
        const game = this.games.get(room)
        return this.#gameSetup(game);
    }



    #gameSetup(game) {
        if (!game) return false;
        if (!this.#setPlayerOrder(game)) return false;
        return true;
    }

    #setPlayerOrder(game) {
        const gamestate = game.gamestate;
        gamestate.playerOrder = []
        game.players.forEach((value, _key) => {
            if (value.dq === false) {
                gamestate.playerOrder.push(value.name)
            }
        });
        if (!gamestate.playerOrder.length) return false;
        gamestate.choosingPlayer = gamestate.playerOrder[0];
        return true;
    }

    getPlayerByName(room, name) {
        if (typeof room !== "string") return;
        if (typeof name !== "string") return;
        const game = this.games.get(room)
        if (!game) return null;
        for (let [uuid, playerData] of game.players) {
            if (playerData.name === name) return uuid
        }
        return null;
    }

    addScore(room, name, value) {
        if (typeof value !== "number") return;
        const uuid = this.getPlayerByName(room, name);
        if (uuid) {
            this.getPlayerData(room, uuid).score += value;
        }
    }

    #getNextChoosingPlayer(game) {
        const gamestate = game.gamestate;
        gamestate.choosingPlayer = gamestate.playerOrder[gamestate.playerOrder.indexOf(gamestate.choosingPlayer) + 1 % gamestate.playerOrder.length];
        return gamestate.choosingPlayer;
    }

    getStage(room) {
        if (typeof room !== "string") return null;
        const game = this.games.get(room)
        if (!game) return null;
        return game.gamestate.stage;
    }

    changeGameState(room, forced=false, params={}) {
        if (typeof room !== "string") return {status: "error", message: "Invalid room"};
        const game = this.games.get(room)
        if (!game) return {status: "error", message: "Game doesn't exist"};
        const gamestate = game.gamestate;

        let next_stage = gamestate.stage;
        switch (gamestate.stage) {
            case "":
                this.gameSetup(game);
                if (!this.#gameSetup(game)) return {status: "error", message: "Can't set up a game"};
                next_stage = "preparation"
                next_stage = "choice" // skipping timer-based stages for now
                
                break;
            case "preparation":
                next_stage = "choice"
                break;
            case "choice":
                if (forced) {
                    gamestate.choosingPlayer = this.#getNextChoosingPlayer(game);
                    // todo: apply penalty if enabled
                } else {
                    //next_stage = "q-preview"
                    if (typeof params.rowId !== "number" || typeof params.colId !== "number")
                        return {status: "error", message: "Not a valid index"};
                    if (params.rowId >= gamestate.categories.length || params.colId >= gamestate.ptColumns.length)
                        return {status: "error", message: "Out of bounds"};
                    if (params.rowId < 0 || params.colId < 0)
                        return {status: "error", message: "Out of bounds"};
                    const y = gamestate.boardstate.some(el => {return el.rowId === params.rowId && el.colId === params.colId});
                    if (y) return {status: "error", message: "Question tile is closed"};
                    gamestate.boardstate.push({row: params.rowId, column: params.colId});
                    const q = game.board[params.rowId][params.colId];
                    if (q === null) return {status: "error", message: "Question doesn't exist here..?"};
                    gamestate.currentQuestion = q.question;
                    gamestate.points = q.points;
                    game.currentAnswer = q.answer;
                    
                    gamestate.choosingPlayer = this.#getNextChoosingPlayer(game);
                    next_stage = "q-waiting"
                }
                break;
            /*case "q-preview":
                next_stage = "q"
                break;*/
            case "q-waiting":
                if (typeof params.name !== "string") return {status: "error", message: "Player name is not a valid string"};
                gamestate.answeringPlayer = params.name;
                next_stage = "q-answer";
                break;
            case "q-answer":
                // if automatic checking enabled verify (and skip to reveal?)
                if (typeof params.answer !== "string") return {status: "error", message: "Answer is not a string"};
                gamestate.currentPlayerAnswer = params.answer
                this.io.sockets.sockets.get(game.creator).emit("answer-toorg-server", {answer: game.currentAnswer})
                next_stage = "q-judgement";
                break;

            case "q-judgement":
                next_stage = "q-waiting"
                if (params.correct === true) {
                    gamestate.choosingPlayer = gamestate.answeringPlayer;
                    this.addScore(room, gamestate.answeringPlayer, gamestate.points);
                    this.io.emit("judgement-result", {answer: game.currentAnswer, result: params.correct});
                    next_stage = "q-reveal"
                }
                else {
                    this.addScore(room, gamestate.answeringPlayer, -gamestate.points);
                }
                
                gamestate.answeringPlayer = null;
                break;
                
            case "q-reveal":
                gamestate.questionsRemaining--;
                if (gamestate.questionsRemaining > 0) {
                    next_stage = "choice";
                }
                else {
                    next_stage = "r-end";
                }
                break;
            case "r-end":
                this.closeGame(room);
                break;
            default: 
        }

        gamestate.stage = next_stage;
        console.log(gamestate)
        this.broadcastGame(room);
        return {status: "success"};
    }

}
module.exports = GameManager