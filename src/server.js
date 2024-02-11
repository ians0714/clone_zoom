import http from "http";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";

import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname+"/views");
app.use("/public", express.static(__dirname+"/public"));

app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true,
      },
});

instrument(wsServer, {
    auth: false,
});

function publicRooms(){
    const {sockets: {adapter: {sids, rooms}}} = wsServer;
    const publicRooms = [];
    rooms.forEach((_, key) => {
        if (sids.get(key) === undefined) {
          publicRooms.push(key);
        }
    });
    return publicRooms;
};

function countRoom(roomName){
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", socket => {
    socket["nickname"] = "Anon";
    wsServer.sockets.emit("room_change", publicRooms());
    socket.on("enter_room", (roomName, nickName, done) => {
        socket["nickname"] = nickName;
        socket.join(roomName);
        done(countRoom(roomName));
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
        wsServer.sockets.emit("room_change", publicRooms());
    });
    socket.on("disconnecting", () => {
        socket.rooms.forEach((room) => socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1));
    });
    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms());
    });
    socket.on("new_message", (message, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${message}`);
        done();
    });
    socket.on("new_name", (nickName) => socket["nickname"] = nickName);
});

const handleListen = () => console.log(`Listening`);
httpServer.listen(3000, handleListen);