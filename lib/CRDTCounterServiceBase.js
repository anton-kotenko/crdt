// Move to dedicated folder services
const CRDTCounter = require('./CRDTCounter.js');
// Notice: current implementation saves state and broadcasts changes
// every time change happens. This is ok for "playground" installation
// But it is bad idea to production installation.
// in "real world" it's requied to implement some throttling at this point

class CRDTCounterServiceBase {
    constructor (nodeId, communicationMesh, persistentStorage) {
        this._nodeId = nodeId;
        this._persistentStorage = persistentStorage;
        this._communicationMesh = communicationMesh;
    }
    async start () {
        // Notice generally we may store only "our own" data
        // Consequences: this requires less storage, but this also increases time
        // required for this node to be consistent: need to wait for updates from all nodes in cluster
        // Seems, that better to store all
        const state = await this._persistentStorage.loadAll();
        this._counter = new CRDTCounter(state);
        this._onNotification = this._handleNotification.bind(this);
        // Generally we may receive our own messages, but CRDT counter is idempotent in terms of merge operation
        // and won't emit changes if no real changes. This breaks loop
        this._communicationMesh.on('change', this._onNotification);
        this._onCounterChange = this._handleCounterChange.bind(this);
        this._counter.on('change', this._onCounterChange);
    }

    async stop () {
        if (this._onNotification) {
            this._communicationMesh.removeListener('change', this._onNotification);
            this._onNotification = null;
        }
        if (this._onCounterChange) {
            this._counter.removeListener('change', this._onCounterChange);
        }
        this._stopSyncLoop();
    }

    getCounter () {
        return this._counter;
    }

    getNodeId () {
        return this._nodeId;
    }

    queryValue () {
        return this._counter.queryValue();
    }

    _handleNotification (otherState) {
        const other = new CRDTCounter(otherState);
        this._counter.merge(other);
    }

    async _handleCounterChange (counterSnapshot) {
        // Notice. we are calling async functions from synchronous event handler.
        // Generally this calls should be serialized and/or throttled
        // to avoid several almost simultaneous broadcasts/saves to persistent storage
        // also it would be good to wrap this into try/catch
        await this._persistentStorage.save(counterSnapshot);
    }
};
module.exports = CRDTCounterServiceBase;
