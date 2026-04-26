import { useContext, useEffect, useState } from 'react'
import './App.css'
import { useSocketContext } from './socket.jsx';
import { Link } from 'react-router-dom';

export function Game() {
    const socket = useSocketContext();
    const [response, setResponse] = useState("")
    useEffect(() => {
        const listener = (message) => {
            console.log("received")
            setResponse(message);
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
            <button onClick={() => send("press-client")} >
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