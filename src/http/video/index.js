const fs = require('fs');
const { Router } = require('express');


module.exports = function (counter) {
    const router = Router();
    router.get('/', function (req, res) {
        counter.add(1);
        let content = fs.readFileSync(__dirname + '/page.html');
        // TODO probably add port
        content = content.toString()
            .replace('{{counterValue}}', counter.get())
            .replace('{{nodeId}}', counter.getNodeId());
        res.status = 200;
        res.set('Content-Type', 'text/html');
        res.end(content);
    });
    return router;
}
