const assert = require('assert');

const amqplib = require('amqplib');

const CommunicationMeshInterface = require('../lib/CommunicationMeshInterface.js');

/**
 * Class that provides communication tool for all CRDT counters in cluster
 * Implementation based on RabbitMQ. Design decision is done in README.md
 */
class NodesCommunicationMesh extends CommunicationMeshInterface {
    /**
     * @param {String} amqpUri connection string to amqp server ('amqp://localhost:5672/vhost')
     * @param {Logger} logger. Will be used to log different events
     */
    constructor (amqpUri, logger) {
        super();
        this._logger = logger;
        this._amqpUri = amqpUri;
        this._exchangeName = 'crdt-counter-exchange';
    }

    /**
     * Start: connect to amqp server and begin to listen proper queues for updates
     * @override {CommunicationMeshInterface}
     * @returns {Promise}
     */
    async start () {
        assert(!this._conn, 'alerady started. Forbidden to start again');
        this._logger.info({ amqpUri: this._amqpUri }, 'Going to connect to rabbitmq');

        // RABBITMQ may be not ready. (this happens in docker compose);
        // TODO better to implement this waiting at docker-compose level.
        for (let tryCount = 50; tryCount > 0; tryCount--) {
            try {
                this._conn = await amqplib.connect(this._amqpUri);
            } catch (e) {
                this._logger.debug({ amqpUri: this._amqpUri, error: e }, 'Failed to connect to rabbitmq. Retry');
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
        assert(this._conn, 'Failed connect to rabbitmq. Going to shutdown');

        this._logger.info('Going to create channel');
        this._channel = await this._conn.createChannel();
        const queue = await this._assertCommunicationEntities();
        this._consumerTag = await this._listenMessages(queue);
    }

    /**
     * Stop: stop listening, close connection to amqp server and cleanout
     * @override {CommunicationMeshInterface}
     * @returns {Promise}
     */
    async stop () {
        if (this._consumerTag) {
            this._logger.info('Going stop listening messages');
            await this._channel.cancel(this._consumerTag);
        }
        if (this._channel) {
            this._logger.info('Going to close channel');
            await this._channel.close();
            this._channel = null;
        }
        if (this._conn) {
            this._logger.info('Going to close amqp connection');
            await this._conn.close();
        }
    }

    /**
     * Create entities at amqp server used for communication (exchange and queue)
     * @returns {Promise}
     */
    async _assertCommunicationEntities () {
        this._logger.info({ exchangeName: this._exchangeName }, 'going to create exchange');

        // Create `fanout` exchange (https://www.rabbitmq.com/tutorials/amqp-concepts.html#exchange-fanout)
        // Used to broadcast messages to all attached queues
        await this._channel.assertExchange(this._exchangeName, 'fanout');
        this._logger.info('exchange created');

        // Anonymous exclusive queue.
        // CRDT counter is designed to handle message lost, so it's safe to remove queue at any time.
        // Ant this protects us from queue overwhelming if one of service instances in cluster crashes
        // without queue removing (in this case exchange will forward messages to queue, and nobody will consume them)
        const queue = await this._channel.assertQueue('', {
            durable: false,
            exclusive: true,
            autoDelete: true
        });
        this._logger.info({ queue: queue.queue }, 'created queue');

        // `bind` queue to exchange
        await this._channel.bindQueue(queue.queue, this._exchangeName);
        this._logger.info({ queue: queue.queue, exchangeName: this._exchangeName }, 'binding queue to exchange');
        return queue.queue;
    }

    /**
     * Begin to listen messasges on queue
     * @param {String} queue
     * @returns {String} returns consumer tag. To have possibility to cancel listener later by consumer tag
     */
    async _listenMessages (queue) {
        const consumerTag = await this._channel.consume(queue, (msg) => {
            if (msg === null) {
                // msg may be equal to null on channel close. Handle this
                return;
            }
            try {
                // TODO use some tools that ensures proper format of message: jsonschemas or protobufs
                const snapshot = JSON.parse(msg.content);
                this._logger.trace('got message', snapshot);
                this.emit('change', snapshot);
            } catch (e) {
                this._logger.error(e, 'Incorrect message');
            }
            this._channel.ack(msg);
        });
        return consumerTag.consumerTag;
    }

    /**
     * Notify all other CRDT counters about current node's state
     * @param {Object<String, String>}
     * @override {CommunicationMeshInterface}
     */
    async broadcast (data) {
        super.broadcast(data);
        await this._channel.publish(this._exchangeName, '', Buffer.from(JSON.stringify(data)));
    }
}
module.exports = NodesCommunicationMesh;
