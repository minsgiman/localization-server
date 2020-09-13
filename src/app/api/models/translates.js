const database = require('../../../service/database');
const dbSchema = database.getSchema();
const dbModel = database.getModel();

const translateSchema = new dbSchema({
    uid: {
        type: String, //"dgb050dh_00001"
        trim: true,
        required: true,
    },
    strid: {
        type: String, //"TOAST_BIZ_GO"
        required: true,
    },
    base: {
        type: String, //"토스트캠 Biz 바로가기"
        required: false,
    },
    tag: {
        type: String, //"Localizable"
        required: false,
    },
    ko: {
        type: String, //"토스트캠 Biz 바로가기"
        required: false,
    },
    ja: {
        type: String, //"トーストカムBiz"
        required: false,
    },
    en: {
        type: String, //"TOAST CAM Biz 바로가기"
        required: false,
    },
    es: {
        type: String,
        required: false,
    },
    de: {
        type: String,
        required: false,
    },
    zh: {
        type: String,
        required: false,
    }
});
module.exports = dbModel('Translate', translateSchema);