import { useContext, useEffect, useState } from 'react'
import './App.css'
import { useSocketContext } from './socket.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Menu.css'

export function Menu() {
    const navigate = useNavigate();
    const socket = useSocketContext();
    const [response, setResponse] = useState("")
    const [creating, setCreating] = useState(false)
    const [username, setUsername] = useState("")
    const [questionList, setQuestionList] = useState([])
    const [category, setCategory] = useState("")
    const [question, setQuestion] = useState("")
    const [points, setPoints] = useState("")
    const [answer, setAnswer] = useState("")

    const addQuestion = (category, question, points, answer) => {
        const questionObj = {category: category, question: question, points: points, answer: answer};
        setQuestionList([...questionList, questionObj]);
    }
    const removeQuestion = (index) => {
        setQuestionList(questionList.filter(q => questionList.indexOf(q) !== index))
    }
    const clearQuestions = () => {
        setQuestionList(questionList.filter(q => false));
    }
    const addQuestions = (list) => {
        setQuestionList([...questionList, ...list]);
    }
    const loadQuestions = (list) => {
        clearQuestions();
        addQuestions(list);
    }

    useEffect(() => {
        const join_success_listener = (params) => {
            toast.success("Joining the lobby", {autoClose: 1500, hideProgressBar: true, pauseOnHover: false});
            navigate("/game", { state: {uuid: params.uuid, room: params.room, name: params.name, isOrganizer: "false"} });
        };
        const error_listener = (params) => {
            if (typeof params.message === "string") {
                toast.error(params.message, {autoClose: 1500, hideProgressBar: true, pauseOnHover: false});
            }
        };
        const create_success_listener = (params) => {
            if (typeof params.room === "string") {
                //toast.success(`Created the lobby, room id: ${params.room}`, {autoClose: 5000, hideProgressBar: false, pauseOnHover: true});
                navigate("/game", { state: {uuid: params.uuid, room: params.room, name: params.name, isOrganizer: "true"} });
            }
        };
        socket.off()
        socket.on("join-room-success", join_success_listener)
        socket.on("create-room-success", create_success_listener)
        socket.on("error", error_listener);
        return () => {
            socket.off();
        }
    });
    function send(type, params={}) {
        console.log("sent")
        socket.emit(type, params);
    }

    return (
        <>
        {!creating &&
        <div>
        <h3>Jeopardy</h3>
        <div className="card">
            <label htmlFor="username-input">Enter username:</label>
            <input className="username-input" type="text" value={username} onChange={(e)=>setUsername(e.target.value)}></input>
            <br/>
            <label htmlFor="code-input">Enter game code:</label>
            <input id="code-input" type="text"></input>
            <br/>
            <button type="button" onClick={() => send("join-room-client",
                {
                    name: username, 
                    room: document.getElementById("code-input")["value"],
                }
            )}>Join game</button>
            <br/>
            <button type="button" onClick={() => setCreating(true)}>Create game</button>
            <p>{response}</p>
        </div>
        </div>}
        
        {creating &&
        <div>
        <h3>Game creation</h3>
        <div className="card">
            <div>
                <button type="button" onClick={() => send("create-room-client",
                    {
                        name: username,
                        questionList: [...questionList],
                        selfpart: (document.getElementById("self-part")["checked"] === true),
                    }
                )}>Create and start game</button>
                <button type="button" onClick={() => setCreating(false)}>Back</button>
            </div>
            <label htmlFor="username-input">Enter username:</label>
            <input className="username-input" type="text" value={username} onChange={(e)=>setUsername(e.target.value)}></input>
            <br/>
            
            <div>
                <input type="checkbox" name="self-part" id="self-part"/><label>Self participation</label>
            </div>
            
            <div>
                
                <div></div>
                <button onClick={()=>{
                    addQuestion(category, question, Number.isFinite(Number(points)) ? Number(points) : 1, answer);
                    setCategory(""); setQuestion(""); setPoints(""); setAnswer("");
                }}>Add question</button>
                <button onClick={()=>{
                    removeQuestion(questionList.length-1)
                }}>Remove question</button>
                <button onClick={()=>{
                    clearQuestions()
                }}>Clear list</button>
            </div>
            <fieldset>
            <legend>Question list</legend>
            <table className="question-table">
                <thead><tr><th>Category</th><th>Question</th><th>Points</th><th>Answer</th></tr></thead>
                <tbody>
                    <tr>
                    <td><input className="category-input" type="text" value={category} onChange={(e)=>setCategory(e.target.value)}></input></td>
                    <td><input className="question-input" type="text" value={question} onChange={(e)=>setQuestion(e.target.value)}></input></td>
                    <td><input className="points-input" type="number" value={points} onChange={(e)=>setPoints(e.target.value)}></input></td>
                    <td><input className="answer-input" type="text" value={answer} onChange={(e)=>setAnswer(e.target.value)}></input></td>
                    </tr>
                    {questionList.map((q) => (
                        <tr>
                            <td>{q.category}</td>
                            <td>{q.question}</td>
                            <td>{q.points}</td>
                            <td>{q.answer}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </fieldset>
        </div>
        </div>}
        </>
    )
   
}