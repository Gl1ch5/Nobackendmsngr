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
            voiceBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>';
            voiceBtn.style.color = '#ff4a4a'; // recording red
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
        voiceBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>';
        voiceBtn.style.color = '';
    }
}