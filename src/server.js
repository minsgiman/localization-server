const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./service/logger');
const database = require('./service/database');
const projects = require('./routes/projects');
const translateList = require('./routes/translateList');
const translates = require('./routes/translates');

const app = express();

logger.loggerInit();
if (process) {
    process.on('uncaughtException', (err) => {   // Exception Handler
        logger.error('Error Worker Caught exception: ' + err);
    });
}
database.mongooseInit();

app.use(bodyParser.urlencoded({extended: false}));

app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "POST, PUT, GET, OPTIONS, DELETE");
    next();
});

app.use('/projects', projects);
app.use('/translateList', translateList);
app.use('/translates', translates);
//app.use('/users', users);

app.use(function(req, res, next) { // handle 404 error
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});
app.use(function(err, req, res, next) { // handle errors
    if (err.status === 404) {
        logger.error('404 error : ' + req.originalUrl + ' (' + req.method + ')');
        res.status(404).json({code: 'nok', message: 'Not found'});
    } else {
        logger.error('Internal error - ' + req.originalUrl + ' (' + req.method + ') err : ' + err);
        res.status(500).json({code: 'nok', message: 'Server error'});
    }
});

app.listen(3000, function(){ console.log('Node server listening on port 3000');});