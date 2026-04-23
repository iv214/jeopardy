import { createContext, useContext, useEffect, useMemo } from "react";
import { io } from "socket.io-client"

export const SocketContext = createContext(null)

export const useSocketContext = () => {
    const context = useContext(SocketContext);
    if (!context) throw Error("useSocketContext outside of ContextProvider");
    return context
}

export const SocketProvider = ({children}) => {
    const url = import.meta.env.VITE_BACKEND_URL;
    console.log("created")
    const socket = useMemo(() => io(url, {transports:["websocket"], autoConnect:true, reconnection:true}), []); // upgrade:false, forceNew:false
    useEffect(() => {
        socket.on("connect", () => {console.log("socket connected")});
        socket.on("disconnect", () => {console.log("socket disconnected")});
        socket.on("connect_error", () => {console.log("socket connection error")});
        return () => {
            if (function() {return !this;}()) return;
            // Closing should not fire in strict mode, otherwise 
            // due to rendering stuff twice the socket is closed before connecting
            // which breaks everything. I'd rather have multiple socket reconnects than that
            // Should look into this later but it is not the current priority
            // and should not affect prod regardless
            socket.close();
        };

    }, []);
    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
/*
export const useSocketEvent = (event, handler, dependencies=[]) => {
    const {socket} = useSocketContext();
    useEffect(() => {
        if (!socket) return;
        socket.on(event, handler);
    }, [socket, event, handler, ...dependencies])
}
export const useSocketEmit = () => {
    const socketContainer = useSocketContext();
    const emit = (event, data) => {
        if (!socketContainer) return;
        socketContainer.emit(event, data)
    }
    return emit
}*/
