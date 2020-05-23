const express = require('express');
const bodyParser = require('body-parser');
// const users = require('./routes/users');
const mongoose = require('./service/database');
const jwt = require('jsonwebtoken');
const app = express();
const logger = require('./service/logger');

app.set('secretKey', 'nodeRestApi'); // jwt secret token

logger.loggerInit();

if (process) {
    process.on('uncaughtException', function (err) {   // Exception Handler
        logger.error('Error Worker Caught exception: ' + err);
    });
}
logger.debug('init server');

// connection to mongodb
// mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));