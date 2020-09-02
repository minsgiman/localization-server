const translatesModel = require('../models/translates');
const looger = require('../../../service/logger');

module.exports = {
    getByProject: function(req, res, next) {
        looger.debug('translateList getByProject');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    },
    createByMap: function(req, res, next) {
        looger.debug('translateList createByMap');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    },
    deleteByKeys: function(req, res, next) {
        looger.debug('translateList deleteByKeys');
        res.json({status:'success', message: 'ok', data: {test: 'good'}});
    }
};
