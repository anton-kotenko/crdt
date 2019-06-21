const WS = require('ws');
class StatsServer {
    constructor (httpServer, counter) {
        this._counter = counter;
        this._httpServer = httpServer;
    }
    async start () {
        this._wsServer = new WS.Server({server: this._httpServer});  
        this._wsServer.on('connection', this._onConnection.bind(this));
    }
    async stop () {
        // FIXME implement me 
    }
    _onConnection(socket)  {
        const onChange = value => {
            socket.send(JSON.stringify({count: value}));
        }
        this._counter.on('change', onChange);
        socket.on('close', () => {
            this._counter.removeListener('change', onChange);
        });
    }
}
module.exports = StatsServer;
