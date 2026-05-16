// Initialize PeerJS
const peer = new Peer();
let connections = {}; // Store active DataConnections
let activeChatId = null;
let replyingTo = null; // Store message object we are replying to

// DOM Elements
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

// --- PeerJS Events ---

peer.on('open', (id) => {
    myIdInput.value = id;
});

peer.on('connection', (conn) => {
    setupConnection(conn);
});

peer.on('error', (err) => {
    console.error(err);
    alert('PeerJS Error: ' + err.message);
});

// --- UI Actions ---

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
    if (!peerId) return;
    if (peerId === peer.id) {
        alert("You cannot connect to yourself.");
        return;
    }
    if (connections[peerId]) {
        alert("Already connected to this peer.");
        return;
    }

    const conn = peer.connect(peerId);
    setupConnection(conn);
    peerIdInput.value = '';
});

// --- Connection Handling ---

function setupConnection(conn) {
    conn.on('open', () => {
        connections[conn.peer] = {
            connection: conn,
            messages: []
        };
        updateConnectionsList();

        // Auto-select if it's the first connection
        if (!activeChatId) {
            selectChat(conn.peer);
        }
    });

    conn.on('data', (data) => {
        // data format: { id: string, text: string, media: {type, data}, timestamp: number, replyTo: { id, text, name } }
        const peerId = conn.peer;
        if (connections[peerId]) {
            connections[peerId].messages.push({...data, sender: 'them'});
            if (activeChatId === peerId) {
                renderMessage(data, 'them');
            }
        }
    });

    conn.on('close', () => {
        addSystemMessage(`Connection closed with ${conn.peer}`);
        delete connections[conn.peer];
        updateConnectionsList();
        if (activeChatId === conn.peer) {
            activeChatId = null;
            disableChat();
        }
    });
}

function updateConnectionsList() {
    connectionsUl.innerHTML = '';
    Object.keys(connections).forEach(peerId => {
        const li = document.createElement('li');
        li.className = `connection-item ${activeChatId === peerId ? 'active' : ''}`;
        li.innerHTML = `
            <div class="peer-avatar"><i class="fa-solid fa-user"></i></div>
            <div class="peer-info">
                <div class="peer-name">${peerId}</div>
                <div class="peer-status">Connected</div>
            </div>
        `;
        li.onclick = () => selectChat(peerId);
        connectionsUl.appendChild(li);
    });
}

// --- Chat Interface ---

function selectChat(peerId) {
    activeChatId = peerId;
    currentChatTitle.textContent = peerId;
    connectionStatus.classList.add('connected');

    enableChat();
    updateConnectionsList();

    // Render existing messages
    chatMessages.innerHTML = '';
    if (connections[peerId] && connections[peerId].messages) {
        connections[peerId].messages.forEach(msg => {
            renderMessage(msg, msg.sender);
        });
    }

    scrollToBottom();
}

function disableChat() {
    currentChatTitle.textContent = 'Select a connection to start chatting';
    connectionStatus.classList.remove('connected');
    chatMessages.innerHTML = `
        <div class="welcome-message">
            <i class="fa-brands fa-rocketchat"></i>
            <p>Welcome to Flat P2P Messenger!</p>
            <p class="subtitle">Share your ID to start a secure peer-to-peer conversation.</p>
        </div>
    `;
    messageInput.disabled = true;
    sendBtn.disabled = true;
    clearReply();
}

function enableChat() {
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
}

// --- Messaging ---

function sendMessage() {
    if (!activeChatId || !connections[activeChatId]) return;

    const text = messageInput.value.trim();
    if (!text && !pendingMedia) return;

    const msgData = {
        id: 'msg_' + Date.now() + Math.random().toString(36).substr(2, 9),
        text: text,
        timestamp: Date.now(),
        sender: 'me'
    };

    if (pendingMedia) {
        msgData.media = pendingMedia;
        pendingMedia = null; // Clear after attaching
    }

    if (replyingTo) {
        msgData.replyTo = {
            id: replyingTo.id,
            name: replyingTo.sender === 'me' ? 'You' : activeChatId,
            text: replyingTo.text || (replyingTo.media ? 'Media' : 'Message')
        };
        clearReply();
    }

    // Send via PeerJS
    connections[activeChatId].connection.send(msgData);

    // Store locally
    connections[activeChatId].messages.push(msgData);

    // Render locally
    renderMessage(msgData, 'me');

    messageInput.value = '';
    messageInput.style.height = 'auto'; // Reset textarea height
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-resize textarea
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if(this.value.trim() !== '') {
        sendBtn.disabled = false;
    }
});

// --- Media Handling ---
let pendingMedia = null;

attachBtn.addEventListener('click', () => {
    mediaInput.click();
});

mediaInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size (e.g., limit to 5MB for WebRTC data channel stability)
    if (file.size > 5 * 1024 * 1024) {
        alert("File is too large. Max size is 5MB.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        pendingMedia = {
            type: file.type,
            data: event.target.result,
            name: file.name
        };
        // Auto send when media is attached to save UX steps
        sendMessage();
    };
    reader.readAsDataURL(file);

    mediaInput.value = ''; // Reset
});

// --- Reply Handling ---

function initiateReply(msg) {
    replyingTo = msg;
    replyPreview.classList.remove('hidden');
    replyPreviewName.textContent = msg.sender === 'me' ? 'You' : activeChatId;

    let previewTxt = msg.text;
    if (!previewTxt && msg.media) {
        previewTxt = msg.media.type.startsWith('image/') ? '📷 Photo' : '🎥 Video/Audio';
    }
    replyPreviewText.textContent = previewTxt;
    messageInput.focus();
}

cancelReplyBtn.addEventListener('click', clearReply);

function clearReply() {
    replyingTo = null;
    replyPreview.classList.add('hidden');
}


// --- Rendering ---

function renderMessage(msg, sender) {
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${sender}`;
    wrapper.id = `wrapper_${msg.id}`;

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;

    // Action button for reply
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    const replyBtn = document.createElement('button');
    replyBtn.className = 'reply-action-btn';
    replyBtn.innerHTML = '<i class="fa-solid fa-reply"></i>';
    replyBtn.onclick = () => initiateReply(msg);
    actionsDiv.appendChild(replyBtn);
    wrapper.appendChild(actionsDiv);

    // Reply Reference
    if (msg.replyTo) {
        const replyRef = document.createElement('div');
        replyRef.className = 'message-reply-ref';
        replyRef.innerHTML = `
            <span class="reply-ref-name">${msg.replyTo.name}</span>
            <span>${msg.replyTo.text}</span>
        `;
        replyRef.onclick = () => {
            const target = document.getElementById(`wrapper_${msg.replyTo.id}`);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.querySelector('.message').style.backgroundColor = '#e0f0ff';
                setTimeout(() => {
                    target.querySelector('.message').style.backgroundColor = '';
                }, 1000);
            }
        };
        msgDiv.appendChild(replyRef);
    }

    // Media
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
             mediaDiv.appendChild(fileLink);
        }
        msgDiv.appendChild(mediaDiv);
    }

    // Text
    if (msg.text) {
        const textSpan = document.createElement('span');
        // Basic sanitization and line breaks
        textSpan.innerHTML = msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
        msgDiv.appendChild(textSpan);
    }

    // Meta (Time)
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

function addSystemMessage(text) {
    const sysDiv = document.createElement('div');
    sysDiv.className = 'system-message';
    sysDiv.textContent = text;
    chatMessages.appendChild(sysDiv);
    scrollToBottom();
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
