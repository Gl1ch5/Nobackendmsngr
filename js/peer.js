import { state } from './state.js';
import * as storage from './storage.js';
import * as ui from './ui.js';

export function initPeer() {
    const savedId = storage.getMyId();
    state.peer = savedId ? new Peer(savedId) : new Peer();

    state.peer.on('open', (id) => {
        storage.setMyId(id);
        ui.updateMyIdDisplay(id);

        // Display saved connections
        const saved = storage.getSavedConnections();
        saved.forEach(peerId => {
            if (!state.connections[peerId]) {
                // Not actively connected yet, but load history
                state.connections[peerId] = {
                    connection: null, // null means disconnected but known
                    messages: storage.loadConnectionHistory(peerId)
                };
            }
        });
        ui.updateConnectionsList();
    });

    state.peer.on('connection', (conn) => {
        setupConnection(conn);
    });

    state.peer.on('error', (err) => {
        console.error(err);
        alert('PeerJS Error: ' + err.message);
    });
}

export function connectToPeer(peerId) {
    if (peerId === state.peer.id) {
        alert("You cannot connect to yourself.");
        return;
    }
    if (state.connections[peerId] && state.connections[peerId].connection) {
        alert("Already connected to this peer.");
        return;
    }

    const conn = state.peer.connect(peerId);
    setupConnection(conn);
}

export function setupConnection(conn) {
    conn.on('open', () => {
        const history = storage.loadConnectionHistory(conn.peer);
        state.connections[conn.peer] = {
            connection: conn,
            messages: history
        };
        storage.saveConnection(conn.peer);
        ui.updateConnectionsList();

        // Auto-select if no active chat
        if (!state.activeChatId) {
            ui.selectChat(conn.peer);
        } else if (state.activeChatId === conn.peer) {
             // Re-render to show connected status
             ui.selectChat(conn.peer);
        }
    });

    conn.on('data', (data) => {
        const peerId = conn.peer;
        if (state.connections[peerId]) {
            const msgObj = {...data, sender: 'them'};
            state.connections[peerId].messages.push(msgObj);
            storage.saveConnectionHistory(peerId, state.connections[peerId].messages);

            if (state.activeChatId === peerId) {
                ui.renderMessage(msgObj, 'them');
            }
        }
    });

    conn.on('close', () => {
        ui.addSystemMessage(`Connection closed with ${conn.peer}`);
        if (state.connections[conn.peer]) {
            state.connections[conn.peer].connection = null;
        }
        ui.updateConnectionsList();
        if (state.activeChatId === conn.peer) {
            ui.disableChat(conn.peer);
        }
    });
}

export function sendMessageToPeer(peerId, msgData) {
    if (state.connections[peerId] && state.connections[peerId].connection) {
        state.connections[peerId].connection.send(msgData);
    }
    const msgObj = {...msgData, sender: 'me'};

    if (!state.connections[peerId]) {
        state.connections[peerId] = { connection: null, messages: [] };
    }
    state.connections[peerId].messages.push(msgObj);
    storage.saveConnectionHistory(peerId, state.connections[peerId].messages);
}