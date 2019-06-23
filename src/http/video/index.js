const fs = require('fs');
const path = require('path');
const browserify = require('browserify');
const { Router } = require('express');

// Lazy implementation of build system for frontend
// two positive features:
// 1. as easy as possible.
// 2. refreshes code at page reload.
async function loadFrontendSources () {
    const b = browserify({});
    return new Promise((resolve, reject) => {
        let buf = Buffer.alloc(0);
        b.transform('babelify', {presets: ['@babel/react']});
        b.add(path.join(__dirname, '../../frontend/main.js'));
        b.bundle()
            .on('end', () => resolve(buf))
            .on('error', reject)
            .on('data', chunk => (buf = Buffer.concat([buf, chunk])));
    });
}

module.exports = function (counterService, config) {
    const router = Router();
    router.get('/', async function (req, res) {
        counterService.increment(1);
        // TODO probably add current's node port
        const js = await loadFrontendSources();
        let content = fs.readFileSync(path.join(__dirname, 'page.html'))
            .toString('utf8')
            // FIXME dirty private property. Dirty to use encodeURIcomponent instead of proper encoding
            .replace('{{snapshot}}', encodeURIComponent(JSON.stringify(counterService._counter.getSnapshot())))
            .replace(/\{\{nodeId\}\}/g, counterService.getNodeId())
            // NOTICE $ in replacement has special meaning. avoid this
            .replace('{{JS}}', () => '\n' + js.toString('utf8') + '\n');

        res.status = 200;
        res.set('Content-Type', 'text/html');
        res.end(content);
    });
    return router;
};
