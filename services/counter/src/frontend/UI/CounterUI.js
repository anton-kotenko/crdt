const React = require('react');
/**
 * User interface for CRDT counter. Just React component
 * @class
 */
class CounterUI extends React.Component {
    /**
     * @constructor
     */
    constructor (props) {
        super(props);
        this.props.counter.on('change', () => {
            this._syncFromCounter();
        });
        this.state = {
            count: this.props.counter.queryValue(),
            snapshot: this.props.counter.getSnapshot(),
            nodeId: this.props.nodeId,
            debugVisible: false
        };
    }

    /**
     * Render whole component
     */
    render () {
        return (<div className="counter">
            <div className="counter__node-id">Served by: {this.state.nodeId}</div>
            <div className="counter__count">Total Requests: {this.state.count}</div>
            <button className="counter__debug-button" onClick={() => this._toggleDebug()}>
                {this.state.debugVisible ? 'Hide' : 'Show'} debug
            </button>
            {this.renderDebugInfo(this.state.snapshot, this.state.debugVisible)}
        </div>);
    }

    /**
     * Render block with debug information: table with nodeId and value of it's associated counter
     */
    renderDebugInfo (snapshot, visible) {
        return (<table className={`counter__debug counter__debug_visible_${visible}`}>
            <thead>
                <tr><td>Machine name</td><td>Served Requests</td></tr>
            </thead>
            <tbody>
                {Object.entries(snapshot).map(([nodeId, count]) => (<tr key={nodeId}>
                    <td className="counter__debug-node">{nodeId}</td>
                    <td className="counter__debug-node-count">{count}</td>
                </tr>))}
            </tbody>
        </table>);
    }

    /**
     * Show/hide debug information button click handler
     */
    _toggleDebug () {
        this.setState(Object.assign({}, this.state, { debugVisible: !this.state.debugVisible }));
    }

    /**
     * Handler for CRDTCounter value change
     * @param {CRDTCounter} counter
     */
    _syncFromCounter (counter) {
        this.setState(Object.assign({}, this.state, {
            count: this.props.counter.queryValue(),
            snapshot: this.props.counter.getSnapshot()
        }));
    }
}
module.exports = CounterUI;
