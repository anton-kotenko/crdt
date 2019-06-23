const fs = require('fs');
const path = require('path');
const browserify = require('browserify');
const { Router } = require('express');

async function loadFrontendJS () {
    const b = browserify({});
    return new Promise((resolve, reject) => {
        let buf = Buffer.alloc(0);
        b.transform('babelify', { presets: ['@babel/react'] });
        b.add(path.join(__dirname, '../../frontend/main.js'));
        b.bundle()
            .on('end', () => resolve(buf))
            .on('error', reject)
            .on('data', chunk => (buf = Buffer.concat([buf, chunk])));
    });
}
async function loadFrontendCSS () {
    return fs.readFileSync(path.join(__dirname, '../../frontend/main.css'));
}

// Lazy implementation of build system for frontend
// two positive features:
// 1. as easy as possible.
// 2. refreshes code at page reload.
async function buildPage () {
    console.log('do rebuild');
    const js = await loadFrontendJS();
    const css = await loadFrontendCSS();
    return fs.readFileSync(path.join(__dirname, 'page.html'))
        .toString('utf8')
        // NOTICE $ in replacement has special meaning and js contains $ symbol. avoid this in tricky way
        .replace('{{JS}}', () => js.toString('utf8'))
        .replace('{{CSS}}', () => css.toString('utf8'));
}

module.exports = function (counterService, config) {
    const router = Router();
    let content;
    router.get('/', async function (req, res) {
        if (!content) {
            content = await buildPage();
        } else if (config.get('DEV_MODE')) {
            content = await buildPage();
        }
        const page = content
            // FIXME Dirty to use encodeURIcomponent instead of proper encoding
            .replace('{{snapshot}}', encodeURIComponent(JSON.stringify(counterService.getCounter().getSnapshot())))
            .replace(/\{\{nodeId\}\}/g, counterService.getNodeId());

        counterService.increment(1);
        res.status = 200;
        res.set('Content-Type', 'text/html');
        res.end(page);
    });
    return router;
};
