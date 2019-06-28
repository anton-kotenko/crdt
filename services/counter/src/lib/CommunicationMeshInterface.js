const EventEmitter = require('events');

/**
 * Class that declares interface and basic implementation for Comminucation mesh.
 * Class `children` are used to provide a way to interact between all CRDT counters in cluster
 */
class CommunicationMeshInterface extends EventEmitter {
    /**
     * Start communication mesh.
     * (implementation specific, do some initialization actions: connect to message brocker, begin to listen for socket, ...);
     */
    async start () {
        throw new Error('implement me');
    }

    /**
     * Stop communication mesh.
     * (implementation specific, do some shutdown actions: like close connections
     */
    async stop () {
        throw new Error('implement me');
    }

    /**
     * Notify all cluster members about counter state at current node
     * @param {Object<String, String>}
     */
    async broadcast (data) {
        this.emit('change', data);
    }
}
module.exports = CommunicationMeshInterface;
