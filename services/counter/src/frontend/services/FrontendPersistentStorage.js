const PersistentStorageInterface = require('../../lib/PersistentStorageInterface.js');

/**
 * @class
 * Frontend specific persistent storage.
 * It's taken into account that
 * a) initial value is taken from page's html
 * b) no save's are reqired
 */
class FrontendPersistentStorage extends PersistentStorageInterface {
    /**
     * @constructor
     * @param {Object<String, Number>} initialState
     */
    constructor (initialState) {
        super();
        this._initialState = initialState;
    }

    /**
     * @override {PersistentStorageInterface}
     */
    async loadAll () {
        return this._initialState || {};
    }

    /**
     * @override {PersistentStorageInterface}
     */
    async save (snapshot) {
        // intentionally left blank
    }
}
module.exports = FrontendPersistentStorage;
