const assert = require('assert');
const React = require('react');
const ReactDom = require('react-dom');
const CRDTCounterServiceBase = require('../../lib/CRDTCounterServiceBase.js');
const PersistentStorageInterface = require('../../lib/PersistentStorageInterface.js');
const CommunicationMeshInterface = require('../../lib/CommunicationMeshInterface.js');

class UI extends React.Component {
    constructor (props) {
        super(props);
        this.props.counter.on('change', () => {
            this._syncFromCounter();
        });
        this.state = {
            count: this.props.counter.queryValue(),
            snapshot: this.props.counter.getSnapshot(),
            nodeId: this.props.nodeId
        };
    }
    render () {
        return (<div className="ui">
            <div className="ui__node-id">{this.state.nodeId}</div>
            <div className="ui__count">{this.state.count}</div>
            <div className="ui__details">{JSON.stringify(this.state.snapshot, null, 4)}</div>

        </div>);
    }
    _syncFromCounter (counter) {
        this.setState(Object.assign({}, this.state, {
            count: this.props.counter.queryValue(),
            snapshot: this.props.counter.getSnapshot()
        }));
    }
}

class FrontendCommunicationMesh extends CommunicationMeshInterface {
    constructor () {
        super();
        this._wsServerUrl = Object.assign(
            new URL(window.location),
            {
                protocol: 'ws://'
            }
        ).toString();
    }
    async start () {
        assert(!this._wsClient, 'communication mesh already started');
        this._wsClient = new WebSocket(this._wsServerUrl);
        this._wsClient.onmessage = (msg) => {
            try {
                const value = JSON.parse(msg.data);
                this.emit('change', value);
            } catch (e) {
                console.error('incorrect message', e);
            }
        };
    }
    async stop () {
        if (this._wsClient) {
            this._wsClient.close();
            this._wsClient = null;
        }
    }
}

class FrontendPersistentStorage extends PersistentStorageInterface {
    constructor (initialState) {
        super();
        this._initialState = initialState;
    }
    async loadAll () {
        return this._initialState || {};
        const value = this._initialState; // localStorage.getItem('counter');
        if (!value) {
            return {};
        }
        try {
            return JSON.parse(value);
        } catch (e) {
            // just ignore error: local storage contains trash
            return {};
        }
    }
    async save (snapshot) {
        localStorage.setItem('counter', JSON.stringify(snapshot));
    }
}

class FrontendCounterService extends CRDTCounterServiceBase {
}

window.onload = async () => {
    const rootNode = document.querySelectorAll('div.root')[0];
    const nodeId = rootNode.dataset.node;
    const snapshot = JSON.parse(decodeURIComponent(rootNode.dataset.snapshot));
    console.log('snapshot', snapshot);
    const communicationMesh = new FrontendCommunicationMesh();
    const storage = new FrontendPersistentStorage(snapshot);
    const counterService = new FrontendCounterService(nodeId, communicationMesh, storage);
    await counterService.start();
    await communicationMesh.start();
    console.log(JSON.stringify(counterService.getCounter().getSnapshot()));
    window.r = ReactDom.render(<UI counter={counterService.getCounter()} nodeId={nodeId} />, rootNode);
};
