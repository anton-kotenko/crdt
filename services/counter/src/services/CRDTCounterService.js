// FIXME Move to dedicated folder services
const CRDTCounterServiceBase = require('../lib/CRDTCounterServiceBase.js');

class CRDTCounterService extends CRDTCounterServiceBase {
    async start () {
        await CRDTCounterServiceBase.prototype.start.call(this);
        // Protective tool: broadcast current state to communication mesh
        // every XXXX seconds. Required to initialize newcomer nodes (with nothing)
        // and as protective tool to guarantee that eventually values will be delivered to all
        // cluster
        this._runSyncLoop();
    }

    async stop () {
        await CRDTCounterServiceBase.prototype.stop.call(this);
        this._stopSyncLoop();
    }

    increment (value) {
        this._counter.increment(this.getNodeId(), value);
    }

    async _handleCounterChange (counterSnapshot) {
        await CRDTCounterServiceBase.prototype._handleCounterChange.call(this, counterSnapshot);
        await this._communicationMesh.broadcast(this._counter.getSnapshot());
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
