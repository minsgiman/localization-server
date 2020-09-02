const database = require('../../../service/database');
const dbSchema = database.getSchema();
const dbModel = database.getModel();

const translateSchema = new dbSchema({
    // name: {
    //     type: String,
    //     trim: true,
    //     required: true,
    // }
});
module.exports = dbModel('Translate', translateSchema);