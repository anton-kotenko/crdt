const Logger = require('./services/logger.js');
const HttpServer = require('./http');
const CRDTCounterService = require('./services/CRDTCounterService.js');
const NodesCommunicationMesh = require('./services/NodesCommunicationMesh');
const PersistentStorage = require('./services/PersistentStorage.js');

/**
 * Represents whole application.
 * @class
 */
class Application {
    constructor () {
        this._config = require('../config');
        this._nodeId = this._config.get('NAME');
        this._logger = Logger(this._config);
        this._communicationMesh = new NodesCommunicationMesh(this._config.get('AMQP_URI'), this._logger);
        this._persistentStorage = new PersistentStorage(this._nodeId, this._config.get('REDIS_URI'));
        this._counterService = new CRDTCounterService(
            this._nodeId,
            this._communicationMesh,
            this._persistentStorage
        );
    }

    /**
     * Start application including all its parts
     * @returns {Promise}
     */
    async start () {
        this._logger.info('Going to start');
        // TODO probably some DI framwwork can be used here
        // instead of poorman DI
        await this._counterService.start();
        await this._communicationMesh.start();
        this._httpServer = new HttpServer(this._counterService, this._communicationMesh, this._config, this._logger);
        await this._httpServer.start();
    }

    /**
     *
     * Stop application including all its parts
     * @returns {Promise}
     */
    async stop () {
        await this._httpServer.stop();
        await this._counter.stop();
        await this._communicationMesh.stop();
    }
}
module.exports = Application;
