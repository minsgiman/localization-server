const express = require('express');
const router = express.Router();
const translatesController = require('../app/api/controllers/translates');

router.post('/', translatesController.create);
router.put('/:translateId', translatesController.updateById);
router.delete('/:translateId', translatesController.deleteById);
router.get('/file', translatesController.getListByFileType);
router.get('/sampleFile', translatesController.getSampleFile);
router.get('/search', translatesController.getListByKeyword);
router.post('/file/:projectId', translatesController.createListByExcel);

module.exports = router;