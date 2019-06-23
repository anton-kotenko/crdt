class PersistentStorageInterface {
    async loadAll () {
        throw new Error('implement me');
    }
    async save (snapshot) {
        throw new Error('implement me');
    }
}
module.exports = PersistentStorageInterface;
