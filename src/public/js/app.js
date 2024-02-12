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
} // Change camera

async function startMedia(){
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection(); // Make connection
}; // Hide welcome and paint call

function handleRoomEnter(event) {
    event.preventDefault();
    const input = welcome.querySelector("input");
    socket.emit("join_room", input.value, startMedia);
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
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomName);
}); // Create offer and set local description then emit the offer

socket.on("offer", offer => {
    console.log("sent offer");
});

// RTC Code
function makeConnection(){
    myPeerConnection = new RTCPeerConnection(); // Create Peer Connection
    myStream.getTracks().forEach(track => {
        myPeerConnection.addtrack(track, myStream);
    }); // Add tracks to send datas of the stream to the connection

}