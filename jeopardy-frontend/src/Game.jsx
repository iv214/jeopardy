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
    let room = null;
    if (location.state !== null && typeof location.state.room === "string") room = location.state.room;
    useEffect(() => {
        if (room == null) {
            toast.error("Not in a game");
            navigate("/");
        }
        else {
            // todo: implement room rejoin
        }
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