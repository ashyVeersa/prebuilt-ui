/*
 * Main functions: core call infrastructure, setting up the callframe and event listeners, creating room URL, and joining
 * Event listener callbacks: fired when specified Daily events execute
 * Call panel button functions: participant controls
 */

/* Main functions */
let callFrame, room;

async function createCallframe() {
  const callWrapper = document.getElementById('wrapper');
  callFrame = await window.DailyIframe.createFrame(callWrapper);

  callFrame.setTheme({
    colors: {
      accent: '#002855',
      accentText: '#fff'
    },
  });


  callFrame
    .on('loaded', showEvent)
    .on('started-camera', showEvent)
    .on('camera-error', showEvent)
    .on('joining-meeting', toggleLobby)
    .on('joined-meeting', handleJoinedMeeting)
    .on('left-meeting', handleLeftMeeting)
    .on('app-message', renderTranscript)
    .on('participant-joined', participantHandler);

  const roomURL = document.getElementById('url-input');
  const joinButton = document.getElementById('join-call');
  const createButton = document.getElementById('create-and-start');
  roomURL.addEventListener('input', () => {
    if (roomURL.checkValidity()) {
      joinButton.classList.add('valid');
      joinButton.classList.remove('disabled-button');
      joinButton.removeAttribute('disabled');
      createButton.classList.add('disabled-button');
    } else {
      joinButton.classList.remove('valid');
    }
  });

  roomURL.addEventListener('keyup', (event) => {
    if (event.keyCode === 13) {
      event.preventDefault();
      joinButton.click();
    }
  });
}

async function createRoom() {
  // This endpoint is using the proxy as outlined in netlify.toml
  const newRoomEndpoint = `${window.location.origin}/api/rooms`;

  // we'll add 30 min expiry (exp) so rooms won't linger too long on your account
  // we'll also turn on chat (enable_chat)
  // see other available options at https://docs.daily.co/reference#create-room
  const exp = Math.round(Date.now() / 1000) + 60 * 30;
  const options = {
    privacy: 'private',
    properties: {
      exp: exp,
      enable_chat: true,
      enable_knocking: true,
    },
  };

  try {
    let response = await fetch(newRoomEndpoint, {
      method: 'POST',
      body: JSON.stringify(options),
      mode: 'cors',
    }),
      room = await response.json();
    return room;
  } catch (e) {
    console.error(e);
  }

  // Comment out the above and uncomment the below, using your own URL
  // if you prefer to test with a hardcoded room
  //  return {url: "https://your-domain.daily.co/hello"}
}


async function getRoomToken(name) {
  const newRoomEndpoint = `https://api.daily.co/v1/meeting-tokens`;
  const options = {
    properties: {
      room_name: name,
      is_owner: true
    },
  };

  try {
    let response = await fetch(newRoomEndpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer b2cebb238d8d4ca8a8602d1c4815b56dd8ab6bde8f15ba5db7a1cb970fbd7d5e` },
      body: JSON.stringify(options),
      mode: 'cors',
    }),
      room = await response.json();
    return room;
  } catch (e) {
    console.error(e);
  }

}

function renderLoader() {
  const img = document.createElement('img');
  img.src = './assets/logo.gif';

  return img
}


async function createRoomAndStart() {
  const createAndStartButton = document.getElementById('create-and-start');
  const copyUrl = document.getElementById('copy-url');
  const errorTitle = document.getElementById('error-title');
  const errorDescription = document.getElementById('error-description');
  const noteText = document.getElementById('note-text');
  const transcriptContainer = document.getElementById('transcript-container');
  const startTranscription = document.getElementById('start-transcription');
  const shareURL = document.getElementById('share-url');

  noteText.classList.add('hide');
  transcriptContainer.classList.add('hide');
  shareURL.classList.add('hide');
  startTranscription.classList.add('hide');

  // createAndStartButton.innerHTML = 'Loading...';
  createAndStartButton.appendChild(renderLoader())
  const lobbyHeading = document.getElementById('lobby-heading');
  const steps = document.getElementById('steps');
  const stepsMobile = document.getElementById('stepsMobile')
  const urlSpan = document.getElementById('url-span')



  room = await createRoom();
  const meetingToken = await getRoomToken(room.name);

  if (!room) {
    errorTitle.innerHTML = 'Error creating room';
    errorDescription.innerHTML =
      "If you're developing locally, please check the README instructions.";
    toggleMainInterface();
    toggleError();
  }
  console.log('createRoomAndStart', room.url, meetingToken, 'meetingToken');
  copyUrl.value = room.url;

  showDemoCountdown();

  try {
    createAndStartButton.innerHTML = '';
    lobbyHeading.classList.remove('hide');
    steps.classList.remove('hide');
    stepsMobile.classList.remove('hide');

    submitUserData(room.name)

    callFrame.join({
      url: room.url,
      token: meetingToken.token,
      showLeaveButton: true,
    });

    urlSpan.value = room.url

  } catch (e) {
    toggleError();
    console.error(e);
  }
}

function cloneURL() {
  const urlSpan = document.getElementById('url-span')
  urlSpan.select();
  urlSpan.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(urlSpan.value);
}

// async function joinCall() {
//   const url = document.getElementById('url-input').value;
//   const copyUrl = document.getElementById('copy-url');


//   copyUrl.value = url;

//   try {
//     await callFrame.join({
//       url: url,
//       showLeaveButton: true,
//     });

//   } catch (e) {
//     if (
//       e.message === "can't load iframe meeting because url property isn't set"
//     ) {
//       toggleMainInterface();
//       console.log('empty URL');
//     }
//     toggleError();
//     console.error(e);
//   }
// }

/* Event listener callbacks and helpers */
function showEvent(e) {
  console.log('callFrame event', e);
}

function toggleHomeScreen() {
  const homeScreen = document.getElementById('start-container');
  homeScreen.classList.toggle('hide');
}

function toggleLobby() {
  const callWrapper = document.getElementById('wrapper');
  callWrapper.classList.toggle('in-lobby');
  toggleHomeScreen();
}

function toggleControls() {
  const callControls = document.getElementById('call-controls-wrapper');
  callControls.classList.toggle('hide');
}

function toggleCallStyling() {
  const callWrapper = document.getElementById('wrapper');
  const createAndStartButton = document.getElementById('create-and-start');

  createAndStartButton.innerHTML = '';
  callWrapper.classList.toggle('in-call');
}

function toggleError() {
  const errorMessage = document.getElementById('error-message');
  errorMessage.classList.toggle('error-message');
  toggleControls();
  toggleCallStyling();
}

function toggleMainInterface() {
  toggleHomeScreen();
  toggleControls();
  toggleCallStyling();
}

function handleJoinedMeeting() {
  const noteText = document.getElementById('note-text');
  const transcriptContainer = document.getElementById('transcript-container');
  const startTranscription = document.getElementById('start-transcription');
  const lobbyHeading = document.getElementById('lobby-heading');
  const steps = document.getElementById('steps');
  const stepsMobile = document.getElementById('stepsMobile');
  const shareURL = document.getElementById('share-url');

  noteText.classList.toggle('hide');
  transcriptContainer.classList.toggle('hide');
  shareURL.classList.toggle('hide');
  startTranscription.classList.toggle('hide');
  lobbyHeading.classList.add('hide');
  steps.classList.add('hide');
  stepsMobile.classList.add('hide')

  toggleLobby();
  toggleMainInterface();
}

function startTranscription() {
  console.log('Transcription-started');
  callFrame.startTranscription();
}

function renderTranscript(msg) {
  if (msg?.fromId === 'transcription' && msg.data?.is_final) {
    const transcriptContainer = document.getElementById('transcript-container')
    data = (`${msg.data.user_name}: ${msg.data.text}`);
    transcriptContainer.innerHTML = `<p>${data}</p>`;
    console.log(data, 'renderTranscript');
  }
}




function handleLeftMeeting() {
  const createAndStartButton = document.getElementById('create-and-start');
  createAndStartButton.innerHTML = '';
  const noteText = document.getElementById('note-text');
  const transcriptContainer = document.getElementById('transcript-container');
  const startTranscription = document.getElementById('start-transcription');
  const shareURL = document.getElementById('share-url');

  noteText.classList.add('hide');
  transcriptContainer.classList.add('hide');
  shareURL.classList.add('hide');
  startTranscription.classList.add('hide');
  window.location.href = "/thankyou.html";
  toggleMainInterface();
}

function resetErrorDesc() {
  const errorTitle = document.getElementById('error-title');
  const errorDescription = document.getElementById('error-description');

  errorTitle.innerHTML = 'Incorrect room URL';
  errorDescription.innerHTML =
    'Meeting link entered is invalid. Please update the room URL.';
}

function tryAgain() {
  toggleError();
  toggleMainInterface();
  resetErrorDesc();
}

/* Call panel button functions */
function copyUrl() {
  const url = document.getElementById('copy-url');
  const copyButton = document.getElementById('copy-url-button');
  url.select();
  document.execCommand('copy');
  copyButton.innerHTML = 'Copied!';
}

function toggleCamera() {
  callFrame.setLocalVideo(!callFrame.participants().local.video);
}

function toggleMic() {
  callFrame.setLocalAudio(!callFrame.participants().local.audio);
}

function toggleScreenshare() {
  let participants = callFrame.participants();
  const shareButton = document.getElementById('share-button');
  if (participants.local) {
    if (!participants.local.screen) {
      callFrame.startScreenShare();
      shareButton.innerHTML = 'Stop screenshare';
    } else if (participants.local.screen) {
      callFrame.stopScreenShare();
      shareButton.innerHTML = 'Share screen';
    }
  }
}

function toggleFullscreen() {
  callFrame.requestFullscreen();
}

function toggleLocalVideo() {
  const localVideoButton = document.getElementById('local-video-button');
  const currentlyShown = callFrame.showLocalVideo();
  callFrame.setShowLocalVideo(!currentlyShown);
  localVideoButton.innerHTML = `${currentlyShown ? 'Show' : 'Hide'
    } local video`;
}

function toggleParticipantsBar() {
  const participantsBarButton = document.getElementById(
    'participants-bar-button'
  );
  const currentlyShown = callFrame.showParticipantsBar();
  callFrame.setShowParticipantsBar(!currentlyShown);
  participantsBarButton.innerHTML = `${currentlyShown ? 'Show' : 'Hide'
    } participants bar`;
}

/* Other helper functions */
// Populates 'network info' with information info from daily-js
async function updateNetworkInfoDisplay() {
  const videoSend = document.getElementById('video-send'),
    videoReceive = document.getElementById('video-receive'),
    packetSend = document.getElementById('packet-send'),
    packetReceive = document.getElementById('packet-receive');

  let statsInfo = await callFrame.getNetworkStats();

  videoSend.innerHTML = `${Math.floor(
    statsInfo.stats.latest.videoSendBitsPerSecond / 1000
  )} kb/s`;

  videoReceive.innerHTML = `${Math.floor(
    statsInfo.stats.latest.videoRecvBitsPerSecond / 1000
  )} kb/s`;

  packetSend.innerHTML = `${Math.floor(
    statsInfo.stats.worstVideoSendPacketLoss * 100
  )}%`;

  packetReceive.innerHTML = `${Math.floor(
    statsInfo.stats.worstVideoRecvPacketLoss * 100
  )}%`;
}

function showRoomInput() {
  const urlInput = document.getElementById('url-input');
  const urlClick = document.getElementById('url-click');
  const urlForm = document.getElementById('url-form');
  urlClick.classList.remove('show');
  urlClick.classList.add('hide');

  urlForm.classList.remove('hide');
  urlForm.classList.add('show');
  urlInput.focus();
}

function showDemoCountdown() {
  const countdownDisplay = document.getElementById('demo-countdown');

  if (!window.expiresUpdate) {
    window.expiresUpdate = setInterval(() => {
      let exp = room && room.config && room.config.exp;
      if (exp) {
        let seconds = Math.floor((new Date(exp * 1000) - Date.now()) / 1000);
        let minutes = Math.floor(seconds / 60);
        let remainingSeconds = Math.floor(seconds % 60);

        countdownDisplay.innerHTML = `Demo expires in ${minutes}:${remainingSeconds > 10 ? remainingSeconds : '0' + remainingSeconds
          }`;
      }
    }, 1000);
  }
}

async function submitUserData(roomName) {
  const data = JSON.parse(localStorage.getItem('userData'))
  const name = `${data.firstName.trim()} ${data.lastName.trim()}`

  const url = `https://createpayment20220408170659.azurewebsites.net/${name}/${roomName}/Payment/save`;

  try {
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }),
      room = await response.json();
    return room;
  } catch (e) {
    console.error(e);
  }
}

function participantHandler() {
  const noteText = document.getElementById('note-text');
  noteText.classList.add('hide')
}
