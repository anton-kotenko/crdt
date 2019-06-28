// Just a healthcheck endpoint
// Notice very simple endpoint. No sense to cut into
// router and controller parts.
const { Router } = require('express');
module.exports = function (config) {
    const router = Router();
    router.get('/', (req, res) => {
        res.set('Content-Type', 'application/json');
        res.status = 200;
        res.end(JSON.stringify({
            status: 'OK',
            nodeId: config.get('NAME')
        }));
    });
    return router;
};
