import { useContext, useEffect, useState } from 'react'
import './App.css'
import { useSocketContext } from './socket.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export function Menu() {
    const navigate = useNavigate();
    const socket = useSocketContext();
    const [response, setResponse] = useState("")
    useEffect(() => {
        const join_success_listener = (params) => {
            toast.success("Joining the lobby", {autoClose: 1500, hideProgressBar: true, pauseOnHover: false});
            navigate("/game", { state: {room: params.room} });
        };
        const error_listener = (params) => {
            if (typeof params.message === "string") {
                toast.error(params.message, {autoClose: 1500, hideProgressBar: true, pauseOnHover: false});
            }
        };
        const create_success_listener = (params) => {
            if (typeof params.room === "string") {
                toast.success(`Created the lobby, room id: ${params.room}`, {autoClose: 5000, hideProgressBar: false, pauseOnHover: true});
                navigate("/game", { state: {room: params.room} });
            }
        };

        socket.on("join-success", join_success_listener)
        socket.on("create-success", create_success_listener)
        socket.on("error", error_listener);
        return () => {
            socket.off("join-success", join_success_listener);
            socket.off("create-success", create_success_listener)
            socket.off("error", error_listener);
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
            <label htmlFor="username-input">Enter username:</label>
            <input id="username-input" type="text"></input>
            <br/>
            <label htmlFor="code-input">Enter game code:</label>
            <input id="code-input" type="text"></input>
            <br/>
            <button type="button" onClick={() => send("join-room-client",
                {
                    name: document.getElementById("username-input")["value"], 
                    room: document.getElementById("code-input")["value"],
                }
            )}>Start game</button>
            <br/>
            <button type="button" onClick={() => send("create-room-client")}>Create game</button>
            <p>{response}</p>
        </div>
        </>
    )
   
}