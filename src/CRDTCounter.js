const EventEmitter = require('events');
class CRDTCounter extends EventEmitter {
    constructor (nodeId, communicationMesh, persistentStorage) {
        super();
        this._nodeId = nodeId;
        this._persistentStorage = persistentStorage;
        this._communicationMesh = communicationMesh;
        this._table = {}; 
    }
    async start () {
        // Notice generally we may store only "our own" data 
        // Consequences: this requies less storage, but this also increases time
        // required for this node to be consistent: need to wait for updates from all nodes in cluster
        // Seems, that better to store all 
        this._table = await this._persistentStorage.loadAll();
        this._onChange = this._handleUpdate.bind(this);
        this._communicationMesh.on('change', this._onChange);
    }
    async stop () {
        if (this._onChange) {
            this._communicationMesh.removeListener('change', this._onChange);
            this._onChange = null;
        }
    }
    getNodeId() {
        return  this._nodeId;
    }

    add (value) {
        this._table[this._nodeId] = this._table[this._nodeId] || 0;
        this._table[this._nodeId] += value;
        this._broadcast();
        console.log('emit change', this.get());
        this.emit('change', this.get());
    }

    get () {
        return Object.values(this._table).reduce((sum, perNode) => sum + perNode, 0); 
    }

    _handleUpdate (nodeId, value) {
        if (nodeId == this._nodeId) {
            return;
        }
        this._table[nodeId] = this._table[nodeId] || 0;
        if (value < this._table[nodeId]) {
            // FIXME log that some broken message was sent
            return;
        }
        this._table[nodeId] = value;
        this.emit('change', this.get());
    }

    async _broadcast () {
        await this._communicationMesh.broadcast(this._nodeId, this._table[this._nodeId] || 0);
    }
};
module.exports = CRDTCounter;

