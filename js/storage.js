export function saveConnectionHistory(peerId, messages) {
    try {
        localStorage.setItem(`chat_${peerId}`, JSON.stringify(messages));
    } catch (e) {
        console.warn("Storage quota exceeded. History not fully saved.", e);
        // Fallback: clear older messages or just don't save
        if (messages.length > 10) {
            try {
                localStorage.setItem(`chat_${peerId}`, JSON.stringify(messages.slice(-10)));
            } catch (err) {
                console.error("Still exceeding quota even with sliced messages.");
            }
        }
    }
}

export function loadConnectionHistory(peerId) {
    const data = localStorage.getItem(`chat_${peerId}`);
    return data ? JSON.parse(data) : [];
}

export function getSavedConnections() {
    const data = localStorage.getItem('saved_connections');
    return data ? JSON.parse(data) : [];
}

export function saveConnection(peerId) {
    const conns = getSavedConnections();
    if (!conns.includes(peerId)) {
        conns.push(peerId);
        localStorage.setItem('saved_connections', JSON.stringify(conns));
    }
}

export function getMyId() {
    return localStorage.getItem('my_peer_id');
}

export function setMyId(id) {
    localStorage.setItem('my_peer_id', id);
}