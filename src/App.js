
const Logger = require('./logger.js');
const HttpServer = require('./http');
const CRDTCounterService = require('./CRDTCounterService.js');
const NodesCommunicationMesh = require('./NodesCommunicationMesh');
const PersistentStorage = require('./PersistentStorage.js');

class Application {
    constructor () {
        this._nodeId = Math.random();
        this._config = require('../config');    
        this._logger = Logger(this._config);
        this._communicationMesh = new NodesCommunicationMesh();
        this._persistentStorage = new PersistentStorage();
        this._counterService = new CRDTCounterService(
            this._nodeId,
            this._communicationMesh,
            this._persistentStorage
        );

    }
    async start () {
        // TODO probably some DI framwwork can be used here
        // instead of poorman DI
        await this._counterService.start();
        this._httpServer = new HttpServer(this._counterService, this._communicationMesh, this._config, this._logger);
        await this._httpServer.start();
    }
    async stop () {
        await this._httpServer.stop(); 
        this._counter.stop();
    }
}
module.exports = Application;
