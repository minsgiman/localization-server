const bcrypt = require('bcrypt');
const database = require('../../../service/database');
const dbSchema = database.getSchema();
const dbModel = database.getModel();

const saltRounds = 10;

const UserSchema = new dbSchema({
    id: {
        type: String,
        trim: true,
        required: true,
    },
    password: {
        type: String,
        trim: true,
        required: true
    },
    admin: {
        type: Boolean,
        required: true
    }
});

// hash user password before saving into database
UserSchema.pre('save', function(next){
    this.password = bcrypt.hashSync(this.password, saltRounds);
    next();
});

module.exports = dbModel('User', UserSchema);