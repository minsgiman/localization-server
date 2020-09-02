const express = require('express');
const router = express.Router();
const projectsController = require('../app/api/controllers/projects');

router.get('/', projectsController.getProjects);
router.post('/', projectsController.create);
router.put('/:projectId', projectsController.updateById);
router.delete('/:projectId', projectsController.deleteById);
router.get('/:projectId/logs', projectsController.getLogsById);
router.delete('/:projectId/translates', projectsController.deleteTranslatesById);

module.exports = router;