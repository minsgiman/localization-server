const translatesModel = require('../models/translates');
const looger = require('../../../service/logger');

module.exports = {
    create: function(req, res, next) {
        looger.debug('translates create');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    },
    updateById: function(req, res, next) {
        looger.debug('translates updateById');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    },
    deleteById: function(req, res, next) {
        looger.debug('translates deleteById');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    },
    getListByFileType: function(req, res, next) {
        looger.debug('translates getListByFileType');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    },
    createListByExcel: function(req, res, next) {
        looger.debug('translates createListByExcel');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    },
    getSampleFile: function(req, res, next) {
        looger.debug('translates getSampleFile');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    },
    getListByKeyword: function(req, res, next) {
        looger.debug('translates getListByKeyword');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    }
}