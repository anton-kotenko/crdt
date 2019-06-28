/**
 * Provide a logger for whole application
 * Implementation based on bunyan logger
 */

/**
 * @typedef {bunyan} Logger
 * just an instance of bunyan logger
 */

const bunyan = require('bunyan');

module.exports = function (config) {
    return bunyan.createLogger({
        name: config.get('NAME'),
        level: config.get('LOG_LEVEL')
    });
};
