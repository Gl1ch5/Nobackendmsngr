import { initPeer } from './peer.js';
import { initUI } from './ui.js';
import { initMedia } from './media.js';

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initMedia();
    initPeer();
});