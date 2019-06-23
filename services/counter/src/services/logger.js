const bunyan = require('bunyan');

module.exports = function (config) {
    return bunyan.createLogger({
        name: config.get('NAME'),
        level: config.get('LOG_LEVEL')
    });
};
