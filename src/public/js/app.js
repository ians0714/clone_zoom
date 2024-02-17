const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const camBtn = document.getElementById("camera");
const camSelect = document.getElementById("cameras");
const call = document.getElementById("call");
const welcome = document.getElementById("welcome");
const enterForm = welcome.querySelector("form");
const header = document.querySelector("header");
const peerFace = document.getElementById("peerFace");
const chatBox = document.getElementById("chatBox");
const chatInput = chatBox.querySelector("form");

let myStream; // Stream
let muted = false; // Audio State
let camOff = false; // Camera State
let roomName; // Accessed Room Name
let myPeerConnection; // Peer Connection of the browser
let myDataChannel; // Data Channel of the browser which sends the offer
let userName;
call.style.display = "none"; // hide call part
peerFace.style.display = "none";
chatBox.style.display = "none";

async function getCameras(){
    try{
        const devices = await navigator.mediaDevices.enumerateDevices(); // Get array of all devices
        const cameras = devices.filter((device) => device.kind === "videoinput"); // Filter and get cam devices
        const curCam = myStream.getVideoTracks()[0]; // Get current camera track
        cameras.forEach((cam) => {
            const option = document.createElement("option");
            option.value = cam.deviceId;
            option.innerText = cam.label;
            if(curCam.label === cam.label){
                option.selected = true; // Select current camera
            }
            camSelect.appendChild(option);
        }); // Append all cam devices into selection
    } catch(error){
        console.log(error);
    }
};

async function getMedia(deviceId){
    const initConst = {
        audio: true, video: { facingMode: "user" },
    }; // Default device
    const camConst = {
        audio: true, video: { deviceId: { exact: deviceId } },
    } // Camera we want to change with
    try{
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId? camConst : initConst
        ); // Try to get videos
        myFace.srcObject = myStream;
        if(!deviceId){ // 오타?
            await getCameras();
        } // Only runs function at the first time
    } catch (error) {
        console.log(error); // If error has caught, print error log on the console
    }
};

function handleMuteClick() { // Change audio state
    myStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
    });
    if(!muted){
        muteBtn.innerText = "Unmute";
        muted = true;
    } else {
        muteBtn.innerText = "Mute";
        muted = false;
    }
};

function handleCameraClick() { // Change cam state
    myStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
    });
    if(!camOff){
        camBtn.innerText = "CAM ON";
        camOff = true;
    } else {
        camBtn.innerText = "CAM OFF";
        camOff = false;
    }
};

async function handleCameraChange() { // Change camera
    await getMedia(camSelect.value);
    if(myPeerConnection){ // If we have any peer connections
        const videoTrack = myStream.getVideoTracks()[0]; // Get video tracks we want to change to
        const videoSender = myPeerConnection.getSenders().find((sender)=>sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack); // Find video track and replace it
    }
}

async function startMedia(){
    welcome.style.display = "none";
    call.style.display = "flex";
    header.style.paddingTop = "0px";
    document.querySelector("h1").style.fontSize = "20px";
    await getMedia();
    makeConnection(); // Make connection
}; // Hide welcome and paint call

function removeOptions(selectElement) {
    var i, L = selectElement.options.length - 1;
    for(i = L; i >= 0; i--) {
       selectElement.remove(i);
    }
 };

async function closeMedia(){
    myStream.getTracks().forEach((track) => {
        if(track.readyState === "live"){
            track.stop();
        }
    });
    myStream.srcObject = null;
    if(peerFace?.srcObject){
        peerFace.srcObject.getTracks().forEach((track) => {
            track.stop();
        });
        peerFace.srcObject = null;
    }
    camSelect.innerHTML = "";
    muteBtn.innerText = "Mute";
    camBtn.innerText = "CAM OFF";
};

async function handleRoomEnter(event) {
    event.preventDefault();
    const input = document.getElementById("roomName");
    const name = document.getElementById("name");
    userName = name.value;
    document.querySelector("h1").innerText = input.value;
    await startMedia(); // Make connection before join the rooms
    socket.emit("join_room", input.value);
    roomName = input.value;
    input.value = "";
    name.value = "";
}; // Send input value and enter the room

function addChatMessage(message){
    const ul = chatBox.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
    chatInput.querySelector("input").value = "";
}

async function handleChatSubmit(event){
    event.preventDefault();
    const input = chatInput.querySelector("input");
    const value = input.value;
    const name = userName;
    addChatMessage(`Me: ${value}`);
    if(myDataChannel){
        myDataChannel.send(`${name}: ${value}`);
    }
}

// Event Listeners
enterForm.addEventListener("submit", handleRoomEnter);
muteBtn.addEventListener("click", handleMuteClick);
camBtn.addEventListener("click", handleCameraClick);
camSelect.addEventListener("input", handleCameraChange);
chatInput.addEventListener("submit", handleChatSubmit);

// Socket Code
// Connection
socket.on("welcome", async () => {
    myDataChannel = myPeerConnection.createDataChannel("chat");
    myDataChannel.addEventListener("message", (event) => addChatMessage(event.data));
    // Create data channel
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomName);
}); // Create offer and set local description then emit the offer

socket.on("offer", async (offer) => { // Got an offer
    myPeerConnection.addEventListener("datachannel", (event) => {
        myDataChannel = event.channel;
        myDataChannel.addEventListener("message", (event) => addChatMessage(event.data));
    }); // Get created data channel
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
}); // Send answer to other users in the room

socket.on("answer", (answer) => {
    myPeerConnection.setRemoteDescription(answer);
}); // Now the browser gets both remote and local description

socket.on("ice", (ice) => {
    myPeerConnection.addIceCandidate(ice);
    peerFace.style.display = "flex";
    chatBox.style.display = "flex";
    call.style.justifyContent = "space-between";
});

socket.on("disconnected", async () => {
    myDataChannel.close()
    myPeerConnection.close();
    myDataChannel = null;
    myPeerConnection = null;
    await closeMedia();
    roomName = "";
    userName = "";
    document.getElementById("roomName").innerText = "Room Name";
    document.getElementById("name").innerText = "User Name";
    var ul = chatBox.querySelector("ul");
    while(ul.firstChild){ul.removeChild(ul.firstChild)};
    header.style.paddingTop = "110px";
    document.querySelector("h1").style.fontSize = "50px";
    document.querySelector("h1").innerText = "COOM";
    call.style.display = "none";
    peerFace.style.display = "none";
    chatBox.style.display = "none";
    welcome.style.display = "flex";
});
// Chat

// RTC Code
function makeConnection(){
    myPeerConnection = new RTCPeerConnection({
        iceServers: [ // Add STUN servers (for test)
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                ],
            },
        ],
    }); // Create Peer Connection
    myPeerConnection.addEventListener("icecandidate", handleIce);
    // addstream is deprecated
    myPeerConnection.addEventListener("track", (data) => {
        const peerFace = document.getElementById("peerFace");
        peerFace.srcObject = data.streams[0];
    }); // Paint video to peerFace by adding track
    myStream.getTracks().forEach((track) => {
        myPeerConnection.addTrack(track, myStream);
    }); // Add tracks to send datas of the stream to the connection
}

// IceCandidate
function handleIce(data){
    socket.emit("ice", data.candidate, roomName);
}