const Application = require('./src/App.js');
(async () => {
    try {
        const app = new Application();
        await app.start();
    } catch (e) {
        console.error('FATAL ERROR', e); 
    }
    // TODO  Signal handling and uncaught exception handling
    // may be implemented here
    // on SIGXXX Application.stop may be called
})();
