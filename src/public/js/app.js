const socket = io();

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");
const room = document.getElementById("room");

room.hidden = true;
let roomName;
let nickName;

function handleMessageSubmit(event){
    event.preventDefault();
    const input = room.querySelector("#msg input");
    const value = input.value;
    socket.emit("new_message", input.value, roomName, () => {
        addMessage(`You: ${value}`);
    });
    input.value = "";
};

function handleChangeNameSubmit(event){
    event.preventDefault();
    const input = room.querySelector("#changeName input");
    const value = input.value;
    nickName = value;
    socket.emit("new_name", value);
    input.value = "";
}

function showRoom(){
    room.hidden = false;
    welcome.hidden = true;
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName}`;
    const msgForm = room.querySelector("#msg");
    const changeNameForm = room.querySelector("#changeName");
    msgForm.addEventListener("submit", handleMessageSubmit);
    changeNameForm.addEventListener("submit", handleChangeNameSubmit);
}

function handleRoomSubmit (event) {
    event.preventDefault();
    const newroomName = form.querySelector("#roomName");
    const nickname = form.querySelector("#nickName");
    socket.emit("enter_room", newroomName.value, nickname.value, showRoom);
    roomName = newroomName.value;
    nickName = nickname.value;
    const changeName = room.querySelector("#changeName");
    changeName.value = nickname.value;
    newroomName.value = "";
    nickname.value = "";
};

function addMessage(message){
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
}

form.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", (user) => addMessage(`${user} joined. Welcome!`));
socket.on("bye", (user) => addMessage(`${user} has left the chat`));
socket.on("new_message", addMessage);