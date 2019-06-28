const CRDTCounterServiceBase = require('../lib/CRDTCounterServiceBase.js');

/**
 * @class
 * CRDT counter service implementation for "backend" (running at server side)
 */
class CRDTCounterService extends CRDTCounterServiceBase {
    /**
     * @override {CRDTCounterServiceBase}
     */
    async start () {
        await super.start(this);
        // Protective tool: broadcast current state to communication mesh
        // every XXXX seconds. Required to initialize newcomer nodes (with nothing)
        // and as protective tool to guarantee that eventually values will be delivered to all
        // cluster
        // This protects us from messages lost. Sooner or later this will deliver
        // current counters changes to all other nodes in cluster
        this._runSyncLoop();
    }

    /**
     * @override {CRDTCounterServiceBase}
     */
    async stop () {
        await super.stop();
        this._stopSyncLoop();
    }

    /**
     * Increase value of counter to `value`
     * @param {Number} value
     */
    increment (value) {
        this._counter.increment(this.getNodeId(), value);
    }

    /**
     * @override {CRDTCounterServiceBase}
     */
    async _handleCounterChange (counterSnapshot) {
        await super._handleCounterChange(counterSnapshot);
        await this._communicationMesh.broadcast(this._counter.getSnapshot());
    }

    /**
     * Start separate `thread` that periodically broadcast value to other cluster members
     */
    _runSyncLoop () {
        this._loopTimer = setTimeout(async () => {
            // TODO: wrap communication into timeout. In case if broadcasting stuck for more then
            // XXX seconds, stop blocking. It's safe to fail here.
            // TODO: wrap in try/catch. Otherwise on first broadcasting error iterative broadcasting will just stop iterating.
            // Errors can be safely ignored, but should be logged
            await this._communicationMesh.broadcast(this._counter.getSnapshot());
            // If sync loop was not stopped, then continue. Otherwise -- stop
            if (this._loopTimer) {
                this._runSyncLoop();
            }
        }, 5000); // TODO make it configurable
    }

    /**
     * Stop `thread` that periodically broadcast value to other cluster members
     */
    _stopSyncLoop () {
        if (this._loopTimer) {
            clearTimeout(this._loopTimer);
        }
    }
};
module.exports = CRDTCounterService;
