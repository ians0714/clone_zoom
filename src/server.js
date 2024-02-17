import http from "http";
import SocketIO from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname+"/views");
app.use("/public", express.static(__dirname+"/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

wsServer.on("connection", (socket) => { // When connected
    socket.on("join_room", (roomName) => { // If join_room event
        socket.join(roomName); // Join to the room
        socket.to(roomName).emit("welcome"); // Send welcome event
        socket.on("disconnecting", ()=> { // If disconnecting
            socket.broadcast.to(roomName).emit("disconnected"); // Send disconnected event
            socket.leave(roomName); // Leave the room
        });
    });
    socket.on("offer", (offer, roomName) => {
        socket.to(roomName).emit("offer", offer);
    });
    socket.on("answer", (answer, roomName) => {
        socket.to(roomName).emit("answer", answer);
    });
    socket.on("ice", (ice, roomName) => {
        socket.to(roomName).emit("ice", ice);
    });
});

const handleListen = () => console.log(`Listening`);
httpServer.listen(5000, handleListen);