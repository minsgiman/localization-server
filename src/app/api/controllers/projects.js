const projectsModel = require('../models/projects');
const translatesModel = require('../models/translates');
const looger = require('../../../service/logger');
const constants = require('../../config');
const util = require('../../../service/util');

module.exports = {
    getProjects: function(req, res, next) {
        looger.debug('projects getProjects');
        const resProjects = [];

        projectsModel.find({}, function(err, projects){
            if (err){
                next(err);
            } else {
                for (let project of projects) {
                    resProjects.push({
                        name: project.name,
                        uuid: project.uuid,
                        languages: project.languages
                    });
                }
                res.send({
                    list: resProjects
                });
            }
        });
    },

    create: function(req, res, next) {
        looger.debug('projects create');

        if (!req.body || !req.body.name || !req.body.languages) {
            res.send({'code' : 'nok', 'error' : 'body parameter is wrong'});
            return;
        }

        projectsModel.create({
            _id: req.body.name,
            name: req.body.name,
            languages: req.body.languages,
            uuid: util.makeUUID(),
            baseLang: constants.BASE_LANGUAGE,
            updateDate: 0
        }, function (err, project) {
            if (err) {
                next(err);
            } else {
                res.send({code: 'ok'});
            }
        });
    },

    updateById: function(req, res, next) {
        looger.debug('projects updateById');

        if (!req.body || !req.body.languages) {
            res.send({'code' : 'nok', 'error' : 'body parameter is wrong'});
            return;
        }

        projectsModel.findByIdAndUpdate(req.params.projectId,{
            languages: req.body.languages
        }, function(err, project){
            if (err) {
                next(err);
            } else {
                res.send({
                    code: 'ok'
                });
            }
        });
    },

    deleteById: function(req, res, next) {
        looger.debug('projects deleteById');

        if (!req.body || !req.body.uuid) {
            res.send({'code' : 'nok', 'error' : 'body parameter is wrong'});
            return;
        }

        const regPattern = `^${req.body.uuid}(.)+`;
        const regEx = new RegExp(regPattern);
        translatesModel.deleteMany({ _id: regEx }, function (err) {
            if (err) {
                next(err);
            } else {
                projectsModel.findByIdAndRemove(req.params.projectId, function (err, project) {
                    if (err) {
                        next(err);
                    } else {
                        res.send({'code' : 'ok'});
                    }
                });
            }
        });
    },

    getLogsById: function(req, res, next) {
        looger.debug('projects getLogs');

        if (req.params.projectId) {
            res.send({'code' : 'ok', 'result': logger.getProjectLog(req.params.projectId)});
        } else {
            res.send({'code' : 'nok', 'error' : 'No projectId'});
        }
    },

    deleteTranslatesById: function(req, res, next) {
        looger.debug('projects deleteTranslates');

        if (!req.body || !req.body.uuid) {
            res.send({'code' : 'nok', 'error' : 'body parameter is wrong'});
            return;
        }

        const regPattern = `^${req.body.uuid}(.)+`;
        const regEx = new RegExp(regPattern);
        translatesModel.deleteMany({ _id: regEx }, function (err) {
            if (err) {
                next(err);
            } else {
                logger.recordProjectLog({
                    type : 'deleteall',
                    request : req,
                    projectId : req.params.projectId
                });
                projectsModel.findByIdAndUpdate(req.params.projectId,{
                    updateDate: new Date().getTime()
                }, function(err, project){
                    if (err) {
                        next(err);
                    } else {
                        res.send({
                            code: 'ok'
                        });
                    }
                });
            }
        });
    }
}