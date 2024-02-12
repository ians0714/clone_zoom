const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const camBtn = document.getElementById("camera");
const camSelect = document.getElementById("cameras");

let myStream; // Stream
let muted = false; // Audio State
let camOff = false; // Camera State

async function getCameras(){
    const devices = navigator.mediaDevices.enumerateDevices(); // Get array of all devices
    const cameras = devices.filter((device) => device.kind === "videoinput"); // Filter and get cam devices
    cameras.forEach((cam) => {
        const option = document.createElement("option");
        option.value = cam.deviceId;
        option.innerText = cam.label;
        camSelect.appendChild(option);
    }); // Append all cam devices into selection
};

async function getMedia(){
    try{
        myStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        }); // Try to get videos
        myFace.srcObject = myStream;
        await getCameras();
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

getMedia();

// Event Listeners
muteBtn.addEventListener("click", handleMuteClick);
camBtn.addEventListener("click", handleCameraClick);
