const database = require('../../../service/database');
const dbSchema = database.getSchema();
const dbModel = database.getModel();

const translateSchema = new dbSchema({
    strid: {
        type: String, //"TOAST_BIZ_GO"
        trim: true,
        required: true,
    },
    base: {
        type: String, //"토스트캠 Biz 바로가기"
        trim: true,
        required: true,
    },
    tag: {
        type: String, //"Localizable"
        trim: true,
        required: false,
    },
    ko: {
        type: String, //"토스트캠 Biz 바로가기"
        trim: true,
        required: false,
    },
    ja: {
        type: String, //"トーストカムBiz"
        trim: true,
        required: false,
    },
    en: {
        type: String, //"TOAST CAM Biz 바로가기"
        trim: true,
        required: false,
    },
    es: {
        type: String,
        trim: true,
        required: false,
    },
    de: {
        type: String,
        trim: true,
        required: false,
    },
    zh: {
        type: String,
        trim: true,
        required: false,
    }
});
module.exports = dbModel('Translate', translateSchema);