const EventEmitter = require('events');
class CRDTCounter extends EventEmitter {
    constructor (state = {}) {
        super();
        this._state = Object.assign({}, state);
    }

    increment (id, count) {
        this._state[id] = this._state[id] || 0;
        this._state[id] += count;
        this.emit('change', this.getSnapshot()); 
    }

    merge (other) {
        if (!(other instanceof this.constructor)) {
            other = new this.constructor(other); 
        }
        let changed = false;
        this._state = Object.keys(this._state).concat(Object.keys(other._state)).reduce((newState, key) => {
            const myValue = this._state[key] || 0;
            const otherValue = other._state[key] || 0;
            newState[key] = Math.max(myValue, otherValue);
            changed = myValue !== newState[key];
            return newState;
        }, {});
        if (changed) {
            this.emit('change', this.getSnapshot()); 
        }
    }
    queryValue () {
        return Object.values(this._state).reduce((sum, val) => sum + val, 0);
    }
    getSnapshot() {
        // To protect myself from changes this._state by reference
        return Object.assign({}, this._state);
    }
}

module.exports = CRDTCounter;
