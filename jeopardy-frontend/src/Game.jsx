import { useContext, useEffect, useState } from 'react'
import './App.css'
import './Game.css'
import { useSocketContext } from './socket.jsx';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export function Game() {
    const socket = useSocketContext();
    const location = useLocation();
    const navigate = useNavigate();
    const [response, setResponse] = useState("")
    

    const [info, setInfo] = useState("")

    const [stage, setStage] = useState("");

    const [boardstate, setBoardstate] = useState([]);
    const [categories, setCategories] = useState([]);
    const [ptColumns, setPtColumns] = useState([]);
    const [hasBeenUpd, setHasBeenUpd] = useState(false);

    const [choosingPlayer, setChoosingPlayer] = useState(null)
    const [answeringPlayer, setAnsweringPlayer] = useState(null)

    const [isOrganizer, setIsOrganizer] = useState(false);
    const card_view_stages = ["q-preview", "q-waiting", "q-answer", "q-judgement", "q-reveal", "q-appeal"];
    const button_available_stages = ["q-waiting"]

    const [question, setQuestion] = useState("");

    const [userAnswer, setUserAnswer] = useState("");
    const [currentPlayerAnswer, setCurrentPlayerAnswer] = useState("")
    const [answer, setAnswer] = useState("");
    const [answerAccepted, setAnswerAccepted] = useState(false)
    
    const [pressedCells, setPressedCells] = useState([]);
    const [messageLog, setMessageLog] = useState([]);
    // note: the game logic itself is handled server-side

    let uuid = null;
    let room = null;
    let name = null;
    let isOrganizerVar = null;
    if (location.state !== null && typeof location.state.uuid === "string") {
        uuid = location.state.uuid;
        sessionStorage.setItem("uuid", uuid)
    }
    else uuid = sessionStorage.getItem("uuid");
    if (location.state !== null && typeof location.state.room === "string") {
        room = location.state.room;
        sessionStorage.setItem("room", room)
    }
    if (location.state !== null && typeof location.state.name === "string") {
        name = location.state.name;
        sessionStorage.setItem("name", name)
    }
    else room = sessionStorage.getItem("room");
    if (location.state !== null && typeof location.state.isOrganizer === "string") {
        isOrganizerVar = location.state.isOrganizer;
        sessionStorage.setItem("isOrganizer", isOrganizerVar)
    }
    else isOrganizerVar = sessionStorage.getItem("isOrganizer");


    useEffect(() => {
        const kick_listener = (params) => {
            if (typeof params.message === "string") {
                toast.error(params.message, {autoClose: 1500, hideProgressBar: true, pauseOnHover: false});
            }
            navigate("/");
        }
        const leave_listener = (params) => {
            if (typeof params.message === "string") {
                toast.success(params.message, {autoClose: 1500, hideProgressBar: true, pauseOnHover: false});
            }
            navigate("/");
        }
        const success_listener = (params) => {
            if (typeof params.message === "string") {
                toast.success(params.message, {autoClose: 1500, hideProgressBar: true, pauseOnHover: false});
            }
        };
        const error_listener = (params) => {
            if (typeof params.message === "string") {
                toast.error(params.message, {autoClose: 1500, hideProgressBar: true, pauseOnHover: false});
            }
        };
        const room_action_broadcast_listener = (params) => {
            if (typeof params.name === "string" && typeof params.id === "string" && typeof params.action === "string") {
                toast.info(`${params.name} [${params.id}] ${params.action} the room`)
            }
        }

        const press_listener = (params) => {
            if (typeof params.name === "string" && typeof params.date === "string") {
                setResponse(`${params.name} was the one to press the button`);
                toast.info(`${params.name} pressed the button`)
            }
        };

        const chat_message_listener = (params) => {
            if (typeof params.name === "string" && typeof params.date === "string" && typeof params.message === "string") {
                const message = {id: messageLog.length+1, name: params.name, date: params.date, message: params.message};
                setMessageLog([...messageLog, message]);
            }
        };

        const judgement_listener = (params) => {
            if (typeof params.answer === "string")
            {
                setAnswer(params.answer);
            }
            if (typeof params.result === "boolean")
            {
                setAnswerAccepted(params.result);
            }
        }
        
        const answer_toorg_listener = (params) => {
            if (typeof params.answer === "string")
            {
                setAnswer(params.answer);
            }
        }

        const gamestate_listener = (params) => {
            setStage(params.gamestate.stage);
            setBoardstate([...boardstate, ...params.gamestate.boardstate.filter(item =>
                ![...boardstate].some(i => i.row == item.row && i.column == item.column))]);
            if (!hasBeenUpd){
                setCategories([...categories, params.gamestate.categories]);
                setPtColumns([...ptColumns, params.gamestate.ptColumns])
                setHasBeenUpd(true);
            }
            if (stage === "choice") {
                setInfo(`${params.gamestate.choosingPlayer} chooses`)
            }
            setQuestion(params.gamestate.currentQuestion);
            setChoosingPlayer(params.gamestate.choosingPlayer);
            setAnsweringPlayer(params.gamestate.answeringPlayer);
            setCurrentPlayerAnswer(params.gamestate.currentPlayerAnswer);
            
            if (stage === "q-answer") console.log(name, name === answeringPlayer)
            //setBoardstate(params.gamestate.boardstate);
            
            //setPtColumns(params.gamestate.ptcolumns)
        };

        socket.off()
        socket.on("press-server", press_listener)
        socket.on("room-action-broadcast", room_action_broadcast_listener)
        socket.on("error", error_listener)
        socket.on("kick", kick_listener)
        socket.on("leave-room-success", leave_listener)
        socket.on("success", success_listener)
        socket.on("chat-message-server", chat_message_listener)
        socket.on("update-gamestate", gamestate_listener)
        socket.on("answer_toorg_server", answer_toorg_listener)
        socket.on("judgement-result", judgement_listener)

        if (room == null) {
            kick_listener({message: "Lost room id"});
        }
        else if (uuid == null) {
            kick_listener({message: "Lost UUID"});
        }
        else {
            socket.emit("rejoin-room-client", {room: room, uuid: uuid});
            socket.emit("fetch-gamestate", {room: room})
            setIsOrganizer(isOrganizerVar === "true");
        }

        return () => {
            socket.off()
        }
    }, [socket]);

    function send(type, params={}) {
        console.log("sent")
        socket.emit(type, params);
    }


    const Board = () => {
    

        const handleBoardPress = (rowId, colId) =>
        {
            console.log(boardstate)
            console.log(boardstate.some(v => {return v.row===rowId && v.column===colId}))
            socket.emit("board-press-client", {uuid: uuid, room: room, rowId: rowId, colId: colId})
        }

        if (stage === "") return (
            <>
            <h2>
                Game hasn't started yet, waiting for host
            </h2>
            {isOrganizer &&
                <button className="organizer-start-game" onClick={() => send("gamestate-change-client", {uuid: uuid, room: room})}>
                    Start game
                </button>
            }
            </>
            
        )
        else
        return (
            <table className="board-view">
                <tbody>
                    {categories.map((row, rowId) => (
                        <tr key={rowId}>
                            <th>{categories[rowId]}</th>
                            {ptColumns.map((_, colId) => (
                                <td key={colId}>
                                    <button disabled={boardstate.some(v => {return v.row===rowId && v.column===colId})}
                                    onClick={() => handleBoardPress(rowId, colId)}>
                                        {ptColumns[colId]}
                                    </button>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        )
    }

    // Chat
    const Chat = () =>
    {
        const [newMessage, setNewMessage] = useState("");
        const sendMessage = (e) => {
            socket.emit("chat-message-client", {room: room, uuid: uuid, message: newMessage.trim()});
            setNewMessage("");
            e.preventDefault();
        }
        return (
            <div className="chat-view">
                <div className="message-log">
                    {messageLog.map(message => (
                        <div key={message.id} className="message">
                            <strong>{message.name}</strong> {message.message}
                        </div>
                        
                    ))}
                </div>
                <form onSubmit={sendMessage} className="new-message-form">  
                    <input type="text" maxLength={255} value={newMessage} onChange={(e)=>setNewMessage(e.target.value)} />
                    <button type="submit" className="send-message-button">Send</button>
                </form>
            </div>
        )
    }

    const sendAnswer = (e) => {
            socket.emit("answer-client", {room: room, uuid: uuid, answer: userAnswer});
            setUserAnswer("");
            e.preventDefault();
    }

    return (
        <>
        {/*<h3>Jeopardy</h3>*/}
        <div className="game-view"> {/* overall view */}
            <div className="main-panel">
                <div className="main-view">
                    {/*{stage === "choice" && */}
                    <Board/>
                </div>
                {card_view_stages.includes(stage) && (
                    <div className="card-view">
                        <h3>{question.toString()}</h3>
                        <button disabled={!button_available_stages.includes(stage)}
                        onClick={() => send("press-client", {uuid: uuid, room: room})} >
                            Press to answer
                        </button>
                        <p>{response}</p>
                        {((stage === "q-answer") && (name === answeringPlayer)) &&
                        <div>
                        <p>Your answer</p>
                        <form onSubmit={sendAnswer} className="answer-form">
                            <input type="text" maxLength={255} value={userAnswer} onChange={(e)=>setUserAnswer(e.target.value)} />
                            <button type="submit" className="send-answer-button">Answer</button>
                        </form>
                        </div>}
                        {stage === "q-judgement" && 
                        <div>
                            <p><strong>User answer: </strong>{currentPlayerAnswer}</p>
                            {isOrganizer &&
                            <div>
                                <p><strong>Correct answer: </strong>{answer}</p>
                                <div className="judgement-panel">
                                    <button onClick={() => {send("gamestate-change-client",
                                        {room: room, uuid: uuid, correct: true})}}>Correct</button>
                                    <button onClick={() => {send("gamestate-change-client",
                                        {room: room, uuid: uuid, correct: false})}}>Incorrect</button>
                                </div>
                            </div>
                            }
                        </div>
                        }
                        {stage === "q-reveal" && 
                        <div>
                            {answerAccepted && <p>That is correct!</p>}
                            <p><strong>The answer was: </strong>{answer}</p>
                            {isOrganizer && <button onClick={() => {send("gamestate-change-client",
                                {room: room, uuid: uuid})}}>Continue</button>}
                        </div>
                        }
                        
                    </div>
                )}
                {stage === "r-end" && 
                    <div>
                        <h2>The game is over</h2>
                        <button className="r-end-room-leave" onClick={() => send("leave-room-client", {uuid: uuid, room: room})}>
                            Leave game
                        </button>
                    </div>
                }
            </div>
            <div className="secondary-panel">
                <div className="room-panel">
                    <div className="room-code">
                        <p>Room code:<br/>{room}</p>
                    </div>
                    <button className="room-leave" onClick={() => send("leave-room-client", {uuid: uuid, room: room})}>
                        Leave game
                    </button>
                </div>
                  
                <Chat/>

                <div>
                    <p>{info}</p>
                </div>
            </div>
            
            
        </div>
        </>
    )
   
}