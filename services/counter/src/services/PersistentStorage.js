const Redis = require('ioredis');
const PersistentStorageInterface = require('../lib/PersistentStorageInterface.js');

/**
 * Class that provides persistent data storage for CRDT counter,
 * to make it able to handle process restarts
 * Implemented as wrapper over Redis.
 * Desined to be fast and simple. Consistency was not considered as main design goal
 */
class PersistentStorage extends PersistentStorageInterface {
    /**
     * @constructor
     * @param {String} nodeId current node identifier
     * @param {String} redisURI connection string for redist in format "redis://127.0.0.1:6379"
     */
    constructor (nodeId, redisURI) {
        super();
        this._nodeId = nodeId;
        const parsedUri = new URL(redisURI);
        this._client = new Redis(parsedUri.port, parsedUri.hostname);
    }

    /**
     * Load saved state for current node as a whole
     * @returns {Object<String, Number>}
     */
    async loadAll () {
        return this._client.hgetall(this._buildKeyName(this._nodeId));
    }

    /**
     * Saves whole data snapshot of counter
     * @param {Object<String, Number>}
     * @returns {Promise}
     */
    async save (snapshot) {
        return this._client.hmset(
            this._buildKeyName(this._nodeId),
            ...Object.entries(snapshot).reduce((total, kv) => total.concat(kv), [])
        );
    }

    /**
     * Buld key used to store data inside of redis
     * @param {String} nodeId
     * @returns {String}
     */
    _buildKeyName (nodeId) {
        return `crdt-${nodeId}`;
    }
}
module.exports = PersistentStorage;
