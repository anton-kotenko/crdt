const Redis = require('ioredis');
const PersistentStorageInterface = require('../lib/PersistentStorageInterface.js');
class PersistentStorage extends PersistentStorageInterface {
    constructor (nodeId, redisURI) {
        super();
        this._nodeId = nodeId;
        const parsedUri = new URL(redisURI);
        this._client = new Redis(parsedUri.port, parsedUri.hostname);
    }
    async loadAll () {
        return this._client.hgetall(this._buildKeyName(this._nodeId));
    }
    async save (snapshot) {
        return this._client.hmset(
            this._buildKeyName(this._nodeId),
            ...Object.entries(snapshot).reduce((total, kv) => total.concat(kv), [])
        );
    }

    _buildKeyName (nodeId) {
        return `crdt-${nodeId}`;
    }
}
module.exports = PersistentStorage;
