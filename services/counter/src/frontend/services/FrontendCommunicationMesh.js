const assert = require('assert');
const CommunicationMeshInterface = require('../../lib/CommunicationMeshInterface.js');
/**
 * @class
 * CRDT cluster communication mesh implementation for frotend.
 * Used websockets to connect to backend.
 * It's supposed that backend will forward updates into websockets channel.
 * Used to implement `real-time` UI updates
 */
class FrontendCommunicationMesh extends CommunicationMeshInterface {
    /**
     * @constructor
     */
    constructor () {
        super();
        this._wsServerUrl = Object.assign(
            new URL(window.location),
            {
                protocol: 'ws://'
            }
        ).toString();
    }

    /**
     * @override {CommunicationMeshInterface}
     * Create websocket and begin to listen it
     */
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

    /**
     * @override {CommunicationMeshInterface}
     * Stop listening for updates and close websocket
     */
    async stop () {
        if (this._wsClient) {
            this._wsClient.close();
            this._wsClient = null;
        }
    }
}
module.exports = FrontendCommunicationMesh;
