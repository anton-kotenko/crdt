const PersistentStorageInterface = require('../lib/PersistentStorageInterface.js');
class PersistentStorage extends PersistentStorageInterface {
    constructor (storageURI) {
        super();
        // FIXME implement me, stub
    }
    async loadAll () {
        // FIXME implement me, stub
        return {};
    }
    async save (snapshot) {
        // FIXME implement me, stub
    }
}
module.exports = PersistentStorage;
