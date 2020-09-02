//Set up mongoose connection
const mongoose = require('mongoose');
const logger = require('./logger');

class database {
    constructor() {
        this._mongoose = null;
        this._mongoDbUrl = 'mongodb+srv://mskang:2306@cluster0.awaqg.mongodb.net/node_rest_api?retryWrites=true&w=majority';
    }

    mongooseInit() {
        this._mongoose = mongoose;
        this._mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error: ' + err);
        });
        this._mongoose.connection.on('connected', () => {
            logger.debug('Mongoose connection open');
        });
        this._mongoose.connect(this._mongoDbUrl, {useNewUrlParser: true, useUnifiedTopology: true});
        mongoose.Promise = global.Promise;
    }

    getSchema() {
        return this._mongoose ? this._mongoose.Schema : null;
    }

    getModel() {
        return this._mongoose ? this._mongoose.model : null;
    }
}

module.exports = new database();