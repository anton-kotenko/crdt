const CRDTCounter = require('../CRDTCounter.js');

function getSnapshotFromLocalStorage () {
    let value = localStorage.getItem('counter');
    if (!value) {
        return;
    }
    try {
        return JSON.parse(value);
    } catch (e) {
        // just ignore error. Local storage contains some trash, nothing better can be done
    }
}
function setSnapshotToLocalStorage (snapshot) {
    localStorage.setItem('counter', JSON.stringify(snapshot));
}

window.onload = () => {
    const snapshot = {};//getSnapshotFromLocalStorage();
    const counter = new CRDTCounter(snapshot);
    const snapshotNode = document.querySelectorAll('.snapshot')[0];
    counter.merge(JSON.parse(decodeURIComponent(snapshotNode.dataset.snapshot)));
    const infoNode = document.querySelectorAll('.info')[0];
    counter.on('change', (snapshot) => {
        setSnapshotToLocalStorage(snapshot);
        infoNode.textContent = JSON.stringify(snapshot, null, 4);
    });
    infoNode.textContent = JSON.stringify(counter.getSnapshot(), null, 4);

    const wsServerUrl = Object.assign(
        new URL(window.location),
        {
            protocol: 'ws://'
        }
    ).toString();
    const wsClient = new WebSocket(wsServerUrl);
    wsClient.onmessage = (msg) => {
        const value = JSON.parse(msg.data);
        counter.merge(value);
    };
};
