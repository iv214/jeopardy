import { useContext, useEffect, useState } from 'react'
import './App.css'
import { useSocketContext } from './socket.jsx';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export function Game() {
    const socket = useSocketContext();
    const location = useLocation();
    const navigate = useNavigate();
    const [response, setResponse] = useState("")
    const [stage, setStage] = useState("q-waiting");
    const [isOrganizer, setIsOrganizer] = useState(false);
    const card_view_stages = ["q-preview", "q-waiting", "q-answer", "q-judgement", "q-reveal", "q-appeal"];
    const button_available_stages = ["q-waiting"]

    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [answerAccepted, setAnswerAccepted] = useState("")
    // note: the game logic itself is handled server-side

    let uuid = null;
    let room = null;
    if (location.state !== null && typeof location.state.uuid === "string") {
        uuid = location.state.uuid;
        sessionStorage.setItem("uuid", uuid)
    }
    else uuid = sessionStorage.getItem("uuid");
    if (location.state !== null && typeof location.state.room === "string") {
        room = location.state.room;
        sessionStorage.setItem("room", room)
    }
    else room = sessionStorage.getItem("room");
    if (location.state !== null && typeof location.state.isOrganizer === "boolean") setIsOrganizer(location.state.isOrganizer === true);

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
            console.log("received")
            if (typeof params.name === "string" && typeof params.date === "string") {
                setResponse(`${params.name} was the one to press the button`);
                toast.info(`${params.name} pressed the button`)
            }
            
        };
        socket.off()
        socket.on("press-server", press_listener)
        socket.on("room-action-broadcast", room_action_broadcast_listener)
        socket.on("error", error_listener)
        socket.on("kick", kick_listener)
        socket.on("leave-room-success", leave_listener)
        socket.on("success", success_listener)

        if (room == null) {
            kick_listener({message: "Lost room id"});
        }
        else if (uuid == null) {
            kick_listener({message: "Lost UUID"});
        }
        else {
            socket.emit("rejoin-room-client", {room: room, uuid: uuid});
        }

        return () => {
            socket.off()
        }
    });

    function send(type, params={}) {
        console.log("sent")
        socket.emit(type, params);
    }

    return (
        <>
        <h3>Jeopardy</h3>
        <div className="card"> {/* overall view */}
            <div className="main-panel">
                <div className="main-view">
                    <h2>main view</h2>
                </div>
                
                {card_view_stages.includes(stage) && (
                    <div className="card-view">
                        <h3>{question.toString()}</h3>
                        <button disabled={!button_available_stages.includes(stage)}
                        onClick={() => send("press-client", {uuid: uuid, room: room})} >
                            Press to answer
                        </button>
                    </div>
                )}
                {}
            </div>
            
            <button onClick={() => send("leave-room-client", {uuid: uuid, room: room})}>
            Leave game
            </button>
            <p>{response}</p>
        </div>
        </>
    )
   
}