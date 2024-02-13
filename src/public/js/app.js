const socket = io();

const welcome = document.getElementById("welcome");
const enterForm = welcome.querySelector("form");
const call = document.getElementById("call");
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const camBtn = document.getElementById("camera");
const camSelect = document.getElementById("cameras");

let myStream; // Stream
let muted = false; // Audio State
let camOff = false; // Camera State
let roomName; // Accessed Room Name
let myPeerConnection; // Peer Connection of the browser
let myDataChannel; // Data Channel of the browser which sends the offer
welcome.hidden = false; // Open welcome part
call.hidden = true; // hide call part

async function getCameras(){
    const devices = navigator.mediaDevices.enumerateDevices(); // Get array of all devices
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
        if(!deviceId){
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

async function handleCameraChange() {
    await getMedia(camSelect.value);
    if(myPeerConnection){ // If we have any peer connections
        const videoTrack = myStream.getVideoTracks()[0]; // Get video tracks we want to change to
        const videoSender = myPeerConnection.getSenders().find((sender)=>sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack); // Find video track and replace it
    }
} // Change camera

async function startMedia(){
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection(); // Make connection
}; // Hide welcome and paint call

async function handleRoomEnter(event) {
    event.preventDefault();
    const input = welcome.querySelector("input");
    await startMedia(); // Make connection before join the room
    socket.emit("join_room", input.value);
    roomName = input.value;
    input.value = "";
}; // Send input value and enter the room

// Event Listeners
muteBtn.addEventListener("click", handleMuteClick);
camBtn.addEventListener("click", handleCameraClick);
enterForm.addEventListener("submit", handleRoomEnter);
camSelect.addEventListener("input", handleCameraChange);

// Socket Code
socket.on("welcome", async () => {
    myDataChannel = myPeerConnection.createDataChannel("chat");
    myDataChannel.addEventListener("message", (event) => console.log(event.data));
    // Create data channel
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomName);
}); // Create offer and set local description then emit the offer

socket.on("offer", async (offer) => { // Got an offer
    myPeerConnection.addEventListener("datachannel", (event) => {
        myDataChannel = event.channel;
        myDataChannel.addEventListener("message", (event) => console.log(event.data));
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
});

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
    myStream.getTracks().forEach(track => {
        myPeerConnection.addtrack(track, myStream);
    }); // Add tracks to send datas of the stream to the connection
}

// IceCandidate
function handleIce(data){
    socket.emit("ice", data.candidate, roomName);
}