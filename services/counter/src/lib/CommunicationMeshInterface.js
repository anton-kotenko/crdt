const EventEmitter = require('events');
class CommunicationMeshInterface extends EventEmitter {
    async start () {
        throw new Error('implement me');
    }
    async stop () {
        throw new Error('implement me');
    }

    async broadcast (data) {
        this.emit('change', data);
    }
}
module.exports = CommunicationMeshInterface;
