module.exports = function (req, res) {
    res.set('Content-Type', 'application/json');
    res.status = 200;
    res.end(JSON.stringify({}));
    // FIXME send my info (port, nodeId, ...);
}
