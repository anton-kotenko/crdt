/**
 * Class that declares interface for persistent data storage for counter.
 */
class PersistentStorageInterface {
    /**
     * Load saved state for current node as a whole
     * @returns {Object<String, Number>}
     */
    async loadAll () {
        throw new Error('implement me');
    }

    /**
     * Saves whole data snapshot of counter
     * @param {Object<String, Number>}
     * @returns {Promise}
     */
    async save (snapshot) {
        throw new Error('implement me');
    }
}
module.exports = PersistentStorageInterface;
