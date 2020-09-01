const express = require('express');
const bodyParser = require('body-parser');
const movies = require('./routes/movies') ;
const users = require('./routes/users');
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
mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(bodyParser.urlencoded({extended: false}));

app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "POST, PUT, GET, OPTIONS, DELETE");
    next();
});

app.get('/', function(req, res){
    res.json({"tutorial" : "Build REST API with node.js"});
});

// public route
app.use('/users', users);

// private route
app.use('/movies', validateUser, movies);

app.get('/favicon.ico', function(req, res) {
    res.sendStatus(204);
});

function validateUser(req, res, next) {
    jwt.verify(req.headers['x-access-token'], req.app.get('secretKey'), function(err, decoded) {
        if (err) {
            res.json({status:"error", message: err.message, data:null});
        }else{
            // add user id to request
            req.body.userId = decoded.id;
            next();
        }
    });
}

// express doesn't consider not found 404 as an error so we need to handle 404 explicitly
// handle 404 error
app.use(function(req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});
// handle errors
app.use(function(err, req, res, next) {
    console.log(err);

    if(err.status === 404)
        res.status(404).json({message: "Not found"});
    else
        res.status(500).json({message: "Something looks wrong :( !!!"});
});

app.listen(3000, function(){ console.log('Node server listening on port 3000');});