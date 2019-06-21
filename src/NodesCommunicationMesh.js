const EventEmitter = require('events');
// FIXME  jsdoc about events
class NodesCommunicationMesh extends EventEmitter {
    constructor (clusterURI) {
        super();    
    } 
    async start () {
    }
    async stop () {
    }
    async broadcast(data) {
        // FIXME implement broadcasting 
    }
}
module.exports = NodesCommunicationMesh;
