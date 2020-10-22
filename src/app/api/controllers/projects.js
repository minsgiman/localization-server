const projectsModel = require('../models/projects');
const translatesModel = require('../models/translates');
const logger = require('../../../service/logger');
const constants = require('../../config');
const util = require('../../../service/util');

module.exports = {
    getProjects: async(req, res, next) => {
        try {
            const resProjects = [];
            const projects = await projectsModel.find({}).exec();

            for (let project of projects) {
                resProjects.push({
                    name: project.name,
                    uuid: project.uuid,
                    languages: project.languages,
                    baseLang: project.baseLang
                });
            }
            return res.send({ list: resProjects });
        } catch (err) {
            return next(err);
        }
    },

    create: async(req, res, next) => {
        if (!req.body || !req.body.name || !req.body.languages || !req.body.base) {
            return res.send({'code' : 'nok', 'error' : 'body parameter is wrong'});
        }

        try {
            await projectsModel.create({
                uid: req.body.name,
                name: req.body.name,
                languages: req.body.languages,
                uuid: util.makeUUID(),
                baseLang: req.body.base,
                updateDate: 0
            });
            logger.recordProjectLog({
                type : 'create_project',
                request : req,
                projectId : req.body.name,
                updateValue : req.body.name
            });
            return res.send({code: 'ok'});
        } catch (err) {
            return next(err);
        }
    },

    updateById: async(req, res, next) => {
        if (!req.body || !req.body.languages || !req.body.base) {
            return res.send({'code' : 'nok', 'error' : 'body parameter is wrong'});
        }

        try {
            await projectsModel.findOneAndUpdate({uid: req.params.projectId}, {
                languages: req.body.languages,
                baseLang: req.body.base
            }).exec();
            logger.recordProjectLog({
                type : 'update_project',
                request : req,
                projectId : req.params.projectId,
                updateValue : req.body.languages
            });
            return res.send({ code: 'ok' });
        } catch (err) {
            return next(err);
        }
    },

    deleteById: async(req, res, next) => {
        if (!req.body || !req.query.uuid) {
            return res.send({'code' : 'nok', 'error' : 'body parameter is wrong'});
        }

        try {
            const regPattern = `^${req.query.uuid}(.)+`;
            const regEx = new RegExp(regPattern);

            await translatesModel.deleteMany({ uid: regEx }).exec();
            await projectsModel.findOneAndRemove({ uid: req.params.projectId }).exec();
            logger.recordProjectLog({
                type : 'delete_project',
                request : req,
                projectId : req.params.projectId,
                updateValue : req.params.projectId
            });
            return res.send({'code' : 'ok'});
        } catch (err) {
            return next(err);
        }
    },

    getLogsById: function(req, res, next) {
        if (req.params.projectId) {
            res.send({'code' : 'ok', 'result': logger.getProjectLog(req.params.projectId)});
        } else {
            res.send({'code' : 'nok', 'error' : 'No projectId'});
        }
    },

    deleteTranslatesById: async(req, res, next) => {
        if (!req.body || !req.query.uuid) {
            return res.send({'code' : 'nok', 'error' : 'body parameter is wrong'});
        }

        try {
            const regPattern = `^${req.query.uuid}(.)+`;
            const regEx = new RegExp(regPattern);

            await translatesModel.deleteMany({ uid: regEx }).exec();
            logger.recordProjectLog({
                type : 'delete_project_translates',
                request : req,
                projectId : req.params.projectId,
                updateValue : req.params.projectId
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