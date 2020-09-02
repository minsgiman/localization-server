const projectsModel = require('../models/projects');
const looger = require('../../../service/logger');

module.exports = {
    getProjects: function(req, res, next) {
        looger.debug('projects getProjects');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    },
    create: function(req, res, next) {
        looger.debug('projects create');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    },
    updateById: function(req, res, next) {
        looger.debug('projects updateById');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    },
    deleteById: function(req, res, next) {
        looger.debug('projects deleteById');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    },
    getLogs: function(req, res, next) {
        looger.debug('projects getLogs');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    },
    deleteTranslates: function(req, res, next) {
        looger.debug('projects deleteTranslates');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    }
}