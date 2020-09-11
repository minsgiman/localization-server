//Set up mongoose connection
const mongoose = require('mongoose');
const logger = require('./logger');

class database {
    constructor() {
        this._mongoDbUrl = 'mongodb+srv://mskang:2306@cluster0.awaqg.mongodb.net/node_rest_api?retryWrites=true&w=majority';
        //'mongodb://127.0.0.1:5050/node_rest_api'
    }

    mongooseInit() {
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error: ' + err);
        });
        mongoose.connection.on('connected', () => {
            logger.debug('Mongoose connection open');
        });
        mongoose.connect(this._mongoDbUrl, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
        mongoose.Promise = global.Promise;
    }

    getSchema() {
        return mongoose.Schema;
    }

    getModel() {
        return mongoose.model;
    }
}

module.exports = new database();