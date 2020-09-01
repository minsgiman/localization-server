//Set up mongoose connection
const mongoose = require('mongoose');
const mongoDB = "mongodb+srv://mskang:2306@cluster0.awaqg.mongodb.net/node_rest_api?retryWrites=true&w=majority";
mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});

mongoose.Promise = global.Promise;

module.exports = mongoose;