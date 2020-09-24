require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const logger = require('./service/logger');
const database = require('./service/database');
const projects = require('./routes/projects');
const translateList = require('./routes/translateList');
const translates = require('./routes/translates');
const users = require('./routes/users');
const path = require('path');

const app = express();

logger.loggerInit();
if (process) {
    process.on('uncaughtException', (err) => {   // Exception Handler
        logger.error('Error Worker Caught exception: ' + err);
    });
}
database.mongooseInit();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, '../public')));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Authorization");
    res.header("Access-Control-Allow-Methods", "POST, PUT, GET, OPTIONS, DELETE");
    next();
});
app.use('/projects', validateUser, projects);
app.use('/translateList', translateList);
app.use('/translates', validateUser, translates);
app.use('/users', users);

function validateUser(req, res, next) {
    if (req.method === 'OPTIONS') {
        return res.send({ code: 'ok' });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.split(" ")[1] : null;
    if (!token) {
        return res.status(401).json({code: 'nok', message: 'Unauthorized'});
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, user) {
        if (err) {
            return res.status(403).json({code: 'nok', message: 'Forbidden'});
        }
        req.user = user;
        next();
    });
}

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

app.listen(process.env.PORT, function(){ console.log(`Node server listening on port ${process.env.PORT}`);});