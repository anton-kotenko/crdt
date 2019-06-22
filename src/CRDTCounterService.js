// Move to dedicated folder services
const CRDTCounter = require('./CRDTCounter.js');
// Notice: current implementation saves state and broadcasts changes
// every time change happens. This is ok for "playground" installation
// But it is bad idea to production installation.
// in "real world" it's requied to implement some throttling at this point

class CRDTCounterService {
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
        // Protective tool: broadcast current state to communication mesh
        // every XXXX seconds. Required to initialize newcomer nodes (with nothing)
        // and as protective tool to guarantee that eventually values will be delivered to all
        // cluster
        this._runSyncLoop();
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

    getNodeId () {
        return this._nodeId;
    }

    increment (value) {
        this._counter.increment(this.getNodeId(), value);
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
        await this._communicationMesh.broadcast(counterSnapshot);
        await this._persistentStorage.save(counterSnapshot);
    }

    _runSyncLoop () {
        this._loopTimer = setTimeout(async () => {
            await this._communicationMesh.broadcast(this._counter.getSnapshot());
            // If sync loop was not stopped, then continue. Othervise -- stop
            if (this._loopTimer) {
                this._runSyncLoop();
            }
        }, 5000); // FIXME take from config
    }

    _stopSyncLoop () {
        if (this._loopTimer) {
            clearTimeout(this._loopTimer);
        }
    }
};
module.exports = CRDTCounterService;
