import { useMemo } from 'react'
import './App.css'
import { SocketProvider } from './socket'
import { Menu } from './Menu'
import { Game } from './Game'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

function App() {
  const router = createBrowserRouter(
    [
      { path: '/', element: <Menu/>, },
      { path: '/game', element: <Game/>, },
    ]
  )
  const socketProvider = useMemo(() => (<SocketProvider><RouterProvider router={router}/></SocketProvider>), [])
  return socketProvider;
}


export default App;
