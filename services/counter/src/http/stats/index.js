const WS = require('ws');
// Frontend's are considered as `passive` nodes, that can not produce their own increments
// so this controller is just a part of comminication mesh. It mirrors updates to client-side
// In real-life there may be excessive "same value" broadcasts. So we'd better to protect ourselves from it
/**
 * @class
 * Works as proxy to forward updates from backend cluster to frontend
 * Websockets are used to
 */

class StatsServer {
    /**
     * @constructor
     * @param {HttpServer} httpServer
     * @param {CommunicationMeshInterface} communicationMesh
     */
    constructor (httpServer, communicationMesh) {
        this._communicationMesh = communicationMesh;
        this._httpServer = httpServer;
    }

    /**
     * Start websockets to listen
     */
    async start () {
        this._wsServer = new WS.Server({ server: this._httpServer });
        this._wsServer.on('connection', this._onConnection.bind(this));
    }

    /**
     * Stop websockets server
     */
    async stop () {
        // TODO implement me
    }

    /**
     * Handle connection from frontend
     * @param socket
     */
    _onConnection (socket) {
        const onChange = snapshot => {
            socket.send(JSON.stringify(snapshot));
        };
        this._communicationMesh.on('change', onChange);
        socket.on('close', () => {
            this._communicationMesh.removeListener('change', onChange);
        });
    }
}
module.exports = StatsServer;
