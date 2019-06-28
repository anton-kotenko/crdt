const ReactDom = require('react-dom');
// It happens that eslint is stupid and does not see where React is used
// So make it to ignore it
const React = require('react'); // eslint-disable-line
const CRDTCounterServiceBase = require('../lib/CRDTCounterServiceBase.js');
const FrontendCommunicationMesh = require('./services/FrontendCommunicationMesh.js');
const FrontendPersistentStorage = require('./services/FrontendPersistentStorage.js');
// It happens that eslint is stupid and does not see where CounterUI is used
// So make it to ignore it
const CounterUI = require('./UI/CounterUI.js'); // eslint-disable-line

window.onload = async () => {
    const rootNode = document.querySelectorAll('div.root')[0];
    const nodeId = rootNode.dataset.node;
    const snapshot = JSON.parse(decodeURIComponent(rootNode.dataset.snapshot));
    const communicationMesh = new FrontendCommunicationMesh();
    const storage = new FrontendPersistentStorage(snapshot);
    // basic implementation of CRDCounterService is enough for frontend
    // as it works as "passive" node in CRDT cluster
    const counterService = new CRDTCounterServiceBase(nodeId, communicationMesh, storage);
    await counterService.start();
    await communicationMesh.start();
    ReactDom.render(<CounterUI counter={counterService.getCounter()} nodeId={nodeId} />, rootNode);
};
