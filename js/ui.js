import { state } from './state.js';
import * as peerLogic from './peer.js';

// Elements
const myIdInput = document.getElementById('my-peer-id');
const copyIdBtn = document.getElementById('copy-id-btn');
const peerIdInput = document.getElementById('peer-id-input');
const connectBtn = document.getElementById('connect-btn');
const connectionsUl = document.getElementById('connections-ul');

const chatArea = document.querySelector('.chat-area');
const currentChatTitle = document.getElementById('current-chat-title');
const connectionStatus = document.getElementById('connection-status');
const chatMessages = document.getElementById('chat-messages');

const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const attachBtn = document.getElementById('attach-btn');
const mediaInput = document.getElementById('media-input');

const replyPreview = document.getElementById('reply-preview');
const replyPreviewName = document.getElementById('reply-preview-name');
const replyPreviewText = document.getElementById('reply-preview-text');
const cancelReplyBtn = document.getElementById('cancel-reply-btn');

export function initUI() {
    copyIdBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(myIdInput.value).then(() => {
            const icon = copyIdBtn.querySelector('i');
            icon.classList.remove('fa-copy');
            icon.classList.add('fa-check');
            setTimeout(() => {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-copy');
            }, 2000);
        });
    });

    connectBtn.addEventListener('click', () => {
        const peerId = peerIdInput.value.trim();
        if (peerId) {
            peerLogic.connectToPeer(peerId);
            peerIdInput.value = '';
        }
    });

    sendBtn.addEventListener('click', handleSendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if(this.value.trim() !== '') {
            sendBtn.disabled = false;
            sendBtn.style.display = 'flex';
            voiceBtn.style.display = 'none';
        } else if (!state.pendingMedia) {
            sendBtn.disabled = true;
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'flex';
        }
    });

    cancelReplyBtn.addEventListener('click', clearReply);
}

export function updateMyIdDisplay(id) {
    myIdInput.value = id;
}

export function updateConnectionsList() {
    connectionsUl.innerHTML = '';
    Object.keys(state.connections).forEach(peerId => {
        const connData = state.connections[peerId];
        const isConnected = !!connData.connection;

        const li = document.createElement('li');
        li.className = `connection-item ${state.activeChatId === peerId ? 'active' : ''}`;
        li.innerHTML = `
            <div class="peer-avatar"><i class="fa-solid fa-user"></i></div>
            <div class="peer-info">
                <div class="peer-name">${peerId}</div>
                <div class="peer-status ${isConnected ? 'online' : 'offline'}">${isConnected ? 'Connected' : 'Offline'}</div>
            </div>
        `;
        li.onclick = () => selectChat(peerId);
        connectionsUl.appendChild(li);
    });
}

export function selectChat(peerId) {
    state.activeChatId = peerId;
    currentChatTitle.textContent = peerId;

    const isConnected = state.connections[peerId] && state.connections[peerId].connection;

    if (isConnected) {
        connectionStatus.classList.add('connected');
        enableChat();
    } else {
        connectionStatus.classList.remove('connected');
        disableChat(peerId, true);
    }

    updateConnectionsList();

    chatMessages.innerHTML = '';
    if (state.connections[peerId] && state.connections[peerId].messages) {
        state.connections[peerId].messages.forEach(msg => {
            renderMessage(msg, msg.sender);
        });
    }

    scrollToBottom();
}

const voiceBtn = document.getElementById('voice-btn');

export function enableChat() {
    messageInput.disabled = false;
    // Send button might be disabled until text is typed
    voiceBtn.disabled = false;
    messageInput.focus();
}

export function disableChat(peerId, keepMessages = false) {
    if (!keepMessages) {
        currentChatTitle.textContent = 'Select a connection to start chatting';
        connectionStatus.classList.remove('connected');
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <i class="fa-brands fa-rocketchat"></i>
                <p>Welcome to Flat P2P Messenger!</p>
                <p class="subtitle">Share your ID to start a secure peer-to-peer conversation.</p>
            </div>
        `;
    }
    messageInput.disabled = true;
    sendBtn.disabled = true;
    voiceBtn.disabled = true;
    sendBtn.style.display = 'none';
    voiceBtn.style.display = 'flex';
    clearReply();
}

function handleSendMessage() {
    if (!state.activeChatId || !state.connections[state.activeChatId] || !state.connections[state.activeChatId].connection) {
        return;
    }

    const text = messageInput.value.trim();
    if (!text && !state.pendingMedia) return;

    const msgData = {
        id: 'msg_' + Date.now() + Math.random().toString(36).substr(2, 9),
        text: text,
        timestamp: Date.now()
    };

    if (state.pendingMedia) {
        msgData.media = state.pendingMedia;
        state.pendingMedia = null;
    }

    if (state.replyingTo) {
        msgData.replyTo = {
            id: state.replyingTo.id,
            name: state.replyingTo.sender === 'me' ? 'You' : state.activeChatId,
            text: state.replyingTo.text || (state.replyingTo.media ? 'Media' : 'Message')
        };
        clearReply();
    }

    peerLogic.sendMessageToPeer(state.activeChatId, msgData);
    renderMessage({...msgData, sender: 'me'}, 'me');

    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;
    sendBtn.style.display = 'none';
    voiceBtn.style.display = 'flex';
}

export function initiateReply(msg) {
    state.replyingTo = msg;
    replyPreview.classList.remove('hidden');
    replyPreviewName.textContent = msg.sender === 'me' ? 'You' : state.activeChatId;

    let previewTxt = msg.text;
    if (!previewTxt && msg.media) {
        previewTxt = msg.media.type.startsWith('image/') ? '📷 Photo' : (msg.media.type.startsWith('audio/') ? '🎤 Voice' : '🎥 Video/Audio');
    }
    replyPreviewText.textContent = previewTxt;
    messageInput.focus();
}

export function clearReply() {
    state.replyingTo = null;
    replyPreview.classList.add('hidden');
}

export function renderMessage(msg, sender) {
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${sender}`;
    wrapper.id = `wrapper_${msg.id}`;

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    const replyBtn = document.createElement('button');
    replyBtn.className = 'reply-action-btn';
    replyBtn.innerHTML = '<i class="fa-solid fa-reply"></i>';
    replyBtn.onclick = () => initiateReply(msg);
    actionsDiv.appendChild(replyBtn);
    wrapper.appendChild(actionsDiv);

    if (msg.replyTo) {
        const replyRef = document.createElement('div');
        replyRef.className = 'message-reply-ref';
        const safeName = msg.replyTo.name ? msg.replyTo.name.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        const safeText = msg.replyTo.text ? msg.replyTo.text.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        replyRef.innerHTML = `
            <span class="reply-ref-name">${safeName}</span>
            <span>${safeText}</span>
        `;
        replyRef.onclick = () => {
            const target = document.getElementById(`wrapper_${msg.replyTo.id}`);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.querySelector('.message').classList.add('highlight');
                setTimeout(() => {
                    target.querySelector('.message').classList.remove('highlight');
                }, 1000);
            }
        };
        msgDiv.appendChild(replyRef);
    }

    if (msg.media) {
        const mediaDiv = document.createElement('div');
        mediaDiv.className = 'message-media';
        if (msg.media.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = msg.media.data;
            mediaDiv.appendChild(img);
        } else if (msg.media.type.startsWith('video/')) {
            const vid = document.createElement('video');
            vid.src = msg.media.data;
            vid.controls = true;
            mediaDiv.appendChild(vid);
        } else if (msg.media.type.startsWith('audio/')) {
            const aud = document.createElement('audio');
            aud.src = msg.media.data;
            aud.controls = true;
            mediaDiv.appendChild(aud);
        } else {
             const fileLink = document.createElement('a');
             fileLink.href = msg.media.data;
             fileLink.download = msg.media.name || 'download';
             fileLink.textContent = `📁 Download ${msg.media.name || 'File'}`;
             fileLink.style.display = 'block';
             fileLink.style.padding = '10px';
             fileLink.style.background = 'rgba(0,0,0,0.05)';
             fileLink.style.borderRadius = '4px';
             fileLink.style.textDecoration = 'none';
             fileLink.style.color = 'inherit';
             mediaDiv.appendChild(fileLink);
        }
        msgDiv.appendChild(mediaDiv);
    }

    if (msg.text) {
        const textSpan = document.createElement('span');
        textSpan.innerHTML = msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
        msgDiv.appendChild(textSpan);
    }

    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    const d = new Date(msg.timestamp);
    timeSpan.textContent = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    metaDiv.appendChild(timeSpan);
    msgDiv.appendChild(metaDiv);

    wrapper.appendChild(msgDiv);
    chatMessages.appendChild(wrapper);

    scrollToBottom();
}

export function addSystemMessage(text) {
    const sysDiv = document.createElement('div');
    sysDiv.className = 'system-message';
    sysDiv.textContent = text;
    chatMessages.appendChild(sysDiv);
    scrollToBottom();
}

export function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}