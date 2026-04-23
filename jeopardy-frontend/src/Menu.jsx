import { useContext, useEffect, useState } from 'react'
import './App.css'
import { useSocketContext } from './socket';
import { Link, useNavigate } from 'react-router-dom';

export function Menu() {
    const navigate = useNavigate();
    const socket = useSocketContext();
    const [response, setResponse] = useState("")
    useEffect(() => {
        const listener = (message) => {
            console.log("received answer, navigating");
            navigate("/game");
        };
        socket.on("press-server", listener)
        return () => socket.off("press-server", listener)
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
            <button type="button" onClick={() => send("press-client")}>Start game</button>
            <br/>
            <Link to="/create">
                <button type="button" onClick={() => send("create-game-client")}>Create game</button>
            </Link>
            <p>{response}</p>
        </div>
        </>
    )
   
}