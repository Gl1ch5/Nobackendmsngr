import { state } from './state.js';
import * as peerLogic from './peer.js';
import * as ui from './ui.js';

const attachBtn = document.getElementById('attach-btn');
const mediaInput = document.getElementById('media-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-btn');

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

export function initMedia() {
    attachBtn.addEventListener('click', () => {
        mediaInput.click();
    });

    voiceBtn.addEventListener('click', toggleVoiceRecording);

    mediaInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large. Max size is 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            state.pendingMedia = {
                type: file.type,
                data: event.target.result,
                name: file.name
            };
            sendBtn.disabled = false; // Enable send button if media attached
            sendBtn.style.display = 'flex';
            voiceBtn.style.display = 'none';
        };
        reader.readAsDataURL(file);

        mediaInput.value = '';
    });
}

async function toggleVoiceRecording() {
    if (!state.activeChatId || !state.connections[state.activeChatId]) return;

    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                if (audioBlob.size > 5 * 1024 * 1024) {
                    alert('Voice message is too long!');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    const msgData = {
                        id: 'msg_' + Date.now() + Math.random().toString(36).substr(2, 9),
                        text: '',
                        media: {
                            type: 'audio/webm',
                            data: event.target.result,
                            name: 'voice_message.webm'
                        },
                        timestamp: Date.now()
                    };

                    if (state.replyingTo) {
                        msgData.replyTo = {
                            id: state.replyingTo.id,
                            name: state.replyingTo.sender === 'me' ? 'You' : state.activeChatId,
                            text: state.replyingTo.text || (state.replyingTo.media ? 'Media' : 'Message')
                        };
                        ui.clearReply();
                    }

                    peerLogic.sendMessageToPeer(state.activeChatId, msgData);
                    ui.renderMessage({...msgData, sender: 'me'}, 'me');
                };
                reader.readAsDataURL(audioBlob);

                // Stop tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;
            voiceBtn.classList.add('recording');
            voiceBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
            voiceBtn.style.color = '#ea0038'; // recording red
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone for voice messaging.");
        }
    } else {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
        voiceBtn.style.color = '';
    }
}