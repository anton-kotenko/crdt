const EventEmitter = require('events');
/**
 * @class
 * CRDT grow only counter data model
 * https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type
 */
class CRDTCounter extends EventEmitter {
    /**
     * @constructor
     * @param {Object<String, Number>} state initiaial state of counter (e.g. loaded from persistent storage)
     */
    constructor (state = {}) {
        super();
        this._state = Object.assign({}, state);
    }

    /**
     * Increase value associated to node `id` to value `count`
     * @param {String} id node identifier
     * @param {Number} count
     * @emits CRDTCounter#change
     */
    increment (id, count) {
        this._state[id] = this._state[id] || 0;
        this._state[id] += count;
        this.emit('change', this.getSnapshot());
    }

    /**
     * Merge value of anoter counter into current
     * @param {CRDTCounter} other
     * in case of changes was observed emit event
     * @emits CRDTCounter#change
     */
    merge (other) {
        if (!(other instanceof this.constructor)) {
            other = new this.constructor(other);
        }
        let changed = false;
        this._state = Object.keys(this._state).concat(Object.keys(other._state)).reduce((newState, key) => {
            const myValue = this._state[key] || 0;
            const otherValue = other._state[key] || 0;
            newState[key] = Math.max(myValue, otherValue);
            changed = changed || myValue !== newState[key];
            return newState;
        }, {});
        if (changed) {
            this.emit('change', this.getSnapshot());
        }
    }

    /**
     * Query value from counter
     * @returns {Number}
     */
    queryValue () {
        return Object.values(this._state).reduce((sum, val) => sum + val, 0);
    }

    /**
     * Return whole state of counter for all nodes
     * @returns{Object<String, String>}
     */
    getSnapshot () {
        // To protect myself from changes this._state by reference
        return Object.assign({}, this._state);
    }
}

module.exports = CRDTCounter;
