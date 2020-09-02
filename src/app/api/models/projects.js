const database = require('../../../service/database');
const dbSchema = database.getSchema();
const dbModel = database.getModel();

const projectSchema = new dbSchema({
    name: {
        type: String, //"b2b_server"
        trim: true,
        required: true,
    },
    languages: {
        type: String, //"ko,ja,en"
        trim: true,
        required: true
    },
    uuid: {
        type: String, //"wy67erHx"
        trim: true,
        required: true
    },
    baseLang: {
        type: String, //"ko"
        trim: true,
        required: true
    },
    updateDate: {
        type: Number, //1545633234848
        required: false
    }
});
module.exports = dbModel('Project', projectSchema);