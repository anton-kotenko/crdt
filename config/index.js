const nconf = require('nconf');
const path = require('path');
const DEFAULTS = require('./default.json');
const ENVIRONMENT = process.env.NODE_ENV;

nconf.use('memory');
nconf.env();
if (ENVIRONMENT) {
    nconf.file(path.resolve(__dirname, `${ENVIRONMENT}.json`));
}
nconf.defaults(DEFAULTS);
nconf.required([
    'LISTEN_PORT',
    'NAME',
    'LOG_LEVEL',
    'AMQP_URI'
]);
module.exports = nconf;
