const EventEmitter = require('events');
// FIXME jsdoc, fill stub methods
class NodesCommunicationMesh extends EventEmitter {
    constructor (clusterURI) {
        super();
    }
    async start () {
    }
    async stop () {
    }
    async broadcast(data) {
        this.emit('change', data);
    }
}
module.exports = NodesCommunicationMesh;
