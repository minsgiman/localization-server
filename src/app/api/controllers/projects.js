const projectsModel = require('../models/projects');
const translatesModel = require('../models/translates');
const logger = require('../../../service/logger');
const constants = require('../../config');
const util = require('../../../service/util');

module.exports = {
    getProjects: async(req, res, next) => {
        logger.debug('projects getProjects');

        try {
            const resProjects = [];
            const projects = await projectsModel.find({}).exec();

            for (let project of projects) {
                resProjects.push({
                    name: project.name,
                    uuid: project.uuid,
                    languages: project.languages
                });
            }
            return res.send({ list: resProjects });
        } catch (err) {
            return next(err);
        }
    },

    create: async(req, res, next) => {
        logger.debug('projects create');

        if (!req.body || !req.body.name || !req.body.languages) {
            return res.send({'code' : 'nok', 'error' : 'body parameter is wrong'});
        }

        try {
            await projectsModel.create({
                uid: req.body.name,
                name: req.body.name,
                languages: req.body.languages,
                uuid: util.makeUUID(),
                baseLang: constants.BASE_LANGUAGE,
                updateDate: 0
            }).exec();
            return res.send({code: 'ok'});
        } catch (err) {
            return next(err);
        }
    },

    updateById: async(req, res, next) => {
        logger.debug('projects updateById');

        if (!req.body || !req.body.languages) {
            return res.send({'code' : 'nok', 'error' : 'body parameter is wrong'});
        }

        try {
            await projectsModel.findOneAndUpdate({uid: req.params.projectId}, {
                languages: req.body.languages
            }).exec();
            return res.send({ code: 'ok' });
        } catch (err) {
            return next(err);
        }
    },

    deleteById: async(req, res, next) => {
        logger.debug('projects deleteById');

        if (!req.body || !req.body.uuid) {
            return res.send({'code' : 'nok', 'error' : 'body parameter is wrong'});
        }

        try {
            const regPattern = `^${req.body.uuid}(.)+`;
            const regEx = new RegExp(regPattern);

            await translatesModel.deleteMany({ uid: regEx }).exec();
            await projectsModel.findOneAndRemove({ uid: req.params.projectId }).exec();
            return res.send({'code' : 'ok'});
        } catch (err) {
            return next(err);
        }
    },

    getLogsById: function(req, res, next) {
        logger.debug('projects getLogs');

        if (req.params.projectId) {
            res.send({'code' : 'ok', 'result': logger.getProjectLog(req.params.projectId)});
        } else {
            res.send({'code' : 'nok', 'error' : 'No projectId'});
        }
    },

    deleteTranslatesById: async(req, res, next) => {
        logger.debug('projects deleteTranslates');

        if (!req.body || !req.body.uuid) {
            return res.send({'code' : 'nok', 'error' : 'body parameter is wrong'});
        }

        try {
            const regPattern = `^${req.body.uuid}(.)+`;
            const regEx = new RegExp(regPattern);

            await translatesModel.deleteMany({ uid: regEx }).exec();
            logger.recordProjectLog({
                type : 'deleteall',
                request : req,
                projectId : req.params.projectId
            });
            await projectsModel.findOneAndUpdate({uid: req.params.projectId},{
                updateDate: new Date().getTime()
            }).exec();
            res.send({ code: 'ok' });
        } catch (err) {
            return next(err);
        }
    }
}