const database = require('../../../service/database');
const dbSchema = database.getSchema();
const dbModel = database.getModel();

const projectSchema = new dbSchema({
    // name: {
    //     type: String,
    //     trim: true,
    //     required: true,
    // }
});
module.exports = dbModel('Project', projectSchema);