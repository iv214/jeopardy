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
    const [stage, setStage] = useState("");
    
    let uuid = null;
    let room = null;
    let isOrganizer = false;
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
    if (location.state !== null && typeof location.state.isOrganizer === "boolean") isOrganizer = location.state.isOrganizer;

    useEffect(() => {
        const kick_listener = (params) => {
            if (typeof params.message === "string") {
                toast.error(params.message, {autoClose: 1500, hideProgressBar: true, pauseOnHover: false});
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
        const join_broadcast_listener = (params) => {
            if (typeof params.name === "string" && typeof params.id === "string") {
                toast.info(`${params.name} [${params.id}] joined the room`)
            }
        }
        const listener = (message) => {
            console.log("received")
            setResponse(message);
        };
        socket.on("press-server", listener)
        socket.on("join-broadcast", join_broadcast_listener)
        socket.on("error", error_listener)
        socket.on("kick", kick_listener)
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
            socket.off("press-server", listener)
            socket.off("join_broadcast", join_broadcast_listener)
            socket.off("error", error_listener)
        }
    });

    function send(type, params={}) {
        console.log("sent")
        socket.emit(type, params);
    }

    return (
        <>
        <h3>Jeopardy</h3>
        <div className="card">
            <button onClick={() => send("press-client", {room: room})} >
            Press
            </button>
            <Link to="/">
                <button type="button">Back to menu</button>
            </Link>
            <p>{response}</p>
        </div>
        </>
    )
   
}