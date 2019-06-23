const assert = require('assert');
const React = require('react');
const ReactDom = require('react-dom');
const CRDTCounterServiceBase = require('../lib/CRDTCounterServiceBase.js');
const PersistentStorageInterface = require('../lib/PersistentStorageInterface.js');
const CommunicationMeshInterface = require('../lib/CommunicationMeshInterface.js');

class CounterUI extends React.Component {
    constructor (props) {
        super(props);
        this.props.counter.on('change', () => {
            this._syncFromCounter();
        });
        this.state = {
            count: this.props.counter.queryValue(),
            snapshot: this.props.counter.getSnapshot(),
            nodeId: this.props.nodeId,
            debugVisible: false
        };
    }
    render () {
        return (<div className="counter">
            <div className="counter__node-id">Served by: {this.state.nodeId}</div>
            <div className="counter__count">Total Requests: {this.state.count}</div>
            <button className="counter__debug-button" onClick={() => this._toggleDebug()}>
            {this.state.debugVisible ? 'Hide' : 'Show'} debug
            </button>
            {this.renderDebugInfo(this.state.snapshot, this.state.debugVisible)}
        </div>);
    }
    renderDebugInfo (snapshot, visible) {
        return (<table className={`counter__debug counter__debug_visible_${visible}`}>
                <thead>
                    <tr><td>Machine name</td><td>Served Requests</td></tr>
                </thead>
                <tbody>
                {Object.entries(snapshot).map(([nodeId, count]) => (<tr key={nodeId}>
                    <td className="counter__debug-node">{nodeId}</td>
                    <td className="counter__debug-node-count">{count}</td>
                </tr>))}
                </tbody>
            </table>);
    }
    _toggleDebug () {
        this.setState(Object.assign({}, this.state, { debugVisible: !this.state.debugVisible }));
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
        // TODO errors should be handled.
        // e.g. server is restarted: ws client should reconnect
        // and try reconnecting periodically
        // until success or until page is closed
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
    }
    async save (snapshot) {
        // intentionally left blank
    }
}

class FrontendCounterService extends CRDTCounterServiceBase {
    // Intentionally left blank. Space for frontend specific code
    // TODO: there is no need in in. Maybe use CRDTCounterServiceBase directly???
}

window.onload = async () => {
    const rootNode = document.querySelectorAll('div.root')[0];
    const nodeId = rootNode.dataset.node;
    const snapshot = JSON.parse(decodeURIComponent(rootNode.dataset.snapshot));
    const communicationMesh = new FrontendCommunicationMesh();
    const storage = new FrontendPersistentStorage(snapshot);
    const counterService = new FrontendCounterService(nodeId, communicationMesh, storage);
    await counterService.start();
    await communicationMesh.start();
    ReactDom.render(<CounterUI counter={counterService.getCounter()} nodeId={nodeId} />, rootNode);
};
