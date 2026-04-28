import { useMemo } from 'react'
import './App.css'
import { SocketProvider } from './socket.jsx'
import { Menu } from './Menu.jsx'
import { Game } from './Game.jsx'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'

function App() {
  const router = createBrowserRouter(
    [
      { path: '/', element: <Menu/>, },
      { path: '/game', element: <Game/>, },
    ]
  )
  const socketProvider = useMemo(() => (<SocketProvider><ToastContainer position="bottom-left"/><RouterProvider router={router}/></SocketProvider>), [])
  return socketProvider;
}


export default App;
