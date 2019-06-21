const { Router } = require('express');
const router = Router();

const controller = require('./controller.js');
router.get('/', controller);
module.exports = router;
