const express = require('express');
const router = express.Router();
const translateListController = require('../app/api/controllers/translateList');

router.get('/', translateListController.getByProject);
router.post('/', translateListController.createByMap);
router.delete('/', translateListController.deleteByKeys);

module.exports = router;