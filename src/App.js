
const Logger = require('./logger.js');
const HttpServer = require('./http');
const CRDTCounterService = require('./CRDTCounterService.js');
const NodesCommunicationMesh = require('./NodesCommunicationMesh');
const PersistentStorage = require('./PersistentStorage.js');

class Application {
    constructor () {
        this._config = require('../config');
        this._nodeId = this._config.get('NAME');
        this._logger = Logger(this._config);
        this._communicationMesh = new NodesCommunicationMesh(this._config.get('AMQP_URI'), this._logger);
        this._persistentStorage = new PersistentStorage();
        this._counterService = new CRDTCounterService(
            this._nodeId,
            this._communicationMesh,
            this._persistentStorage
        );

    }
    async start () {
        this._logger.info('Going to start');
        // TODO probably some DI framwwork can be used here
        // instead of poorman DI
        await this._counterService.start();
        await this._communicationMesh.start();
        this._httpServer = new HttpServer(this._counterService, this._communicationMesh, this._config, this._logger);
        await this._httpServer.start();
    }
    async stop () {
        await this._httpServer.stop();
        await this._counter.stop();
        await this._communicationMesh.stop();
    }
}
module.exports = Application;
