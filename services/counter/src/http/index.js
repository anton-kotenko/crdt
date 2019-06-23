const assert = require('assert');

const express = require('express');
const http = require('http');

const healthcheck = require('./healthcheck');
const video = require('./video');
const StatsServer = require('./stats');

class HttpServer {
    constructor (counterService, communicationMesh, config, logger) {
        this._counterService = counterService;
        this._communicationMesh = communicationMesh;
        this._config = config;
        this._logger = logger;
    }
    async start () {
        assert(!this._server, 'http server is already started');
        this._app = express();
        this._app.use('/healthcheck', healthcheck(this._config));
        this._app.use('/', video(this._counterService));

        this._server = http.createServer(this._app);
        this._statsServer = new StatsServer(this._server, this._communicationMesh);
        await this._statsServer.start();
        this._logger.info({ port: this._config.get('LISTEN_PORT') }, 'Goint to listen http:// and ws:// at port');
        this._server.listen(this._config.get('LISTEN_PORT'));
    }
    async stop () {
        if (this._app) {
            // FIXME stop everybody
            this._app = null;
            this._server = null;
            await this._statsServer.stop();
            this._statsServer = null;
        }
    }
}

module.exports = HttpServer;
