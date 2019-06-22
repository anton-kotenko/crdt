const assert = require('assert');
const EventEmitter = require('events');
const amqplib = require('amqplib');
// FIXME jsdoc
class NodesCommunicationMesh extends EventEmitter {
    constructor (amqpUri, logger) {
        super();
        this._logger = logger;
        this._amqpUri = amqpUri;
        this._exchangeName = 'crdt-counter-exchange';
    }
    async start () {
        assert(!this._conn, 'alerady started. Forbidden to start again');
        this._logger.info({ amqpUri: this._amqpUri }, 'Going to connect to rabbitmq');

        // RABBITMQ may be not ready. (this happens in docker compose);
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

    async _assertCommunicationEntities () {
        this._logger.info({ exchangeName: this._exchangeName }, 'going to create exchange');
        await this._channel.assertExchange(this._exchangeName, 'fanout');
        const queue = await this._channel.assertQueue('', {
            durable: false,
            exclusive: true,
            autoDelete: true
        });
        this._logger.info({ queue: queue.queue }, 'created queue');
        await this._channel.bindQueue(queue.queue, this._exchangeName);
        this._logger.info({ queue: queue.queue, exchangeName: this._exchangeName }, 'binding queue to exchange');
        return queue.queue;
    }

    async _listenMessages (queue) {
        const consumerTag = await this._channel.consume(queue, (msg) => {
            if (msg === null) {
                // msg may be equal to null on channel close. handle this
                return;
            }
            try {
                // TODO probably better to apply some tools that ensures proper format of message: jsonschemas or protobufs
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

    async broadcast (data) {
        await this._channel.publish(this._exchangeName, '', Buffer.from(JSON.stringify(data)));
        this.emit('change', data);
    }
}
module.exports = NodesCommunicationMesh;
