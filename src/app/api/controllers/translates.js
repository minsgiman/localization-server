const translatesModel = require('../models/translates');
const projectsModel = require('../models/projects');
const logger = require('../../../service/logger');
const util = require('../../../service/util');
const config = require('../../config');
const fs = require('fs');
const xlsx = require('xlsx');
const native2ascii = require('node-native2ascii');
const formidable = require('formidable');

const UPLOAD_PATH = process.env.UPLOAD_PATH;
const DOWNLOAD_PATH = process.env.DOWNLOAD_PATH;

function findKeyByStrId (strid, translates) {
    if (!translates || !translates.length) {
        return null;
    }

    let foundKey = null;
    translates.some((translate) => {
        if (translate.strid === strid) {
            foundKey = translate.uid;
            return true;
        }
        return false;
    });

    return foundKey;
}

function buildBulkUpsertOperationsByXlDatas({xlDatas, curTranslates, pUuid}) {
    const bulkOperations = [];
    let keyNumber = util.getEmptyKeyNumberStr(curTranslates),
        key = pUuid + '_' + keyNumber, foundKey;

    xlDatas.forEach((xlData) => {
        const dataObj = {
            strid: xlData.strid ? xlData.strid : key,
            tag: xlData.tag ? xlData.tag : ''
        };
        config.SUPPORT_LANGUAGES.forEach((lang) => {
            dataObj[lang] = xlData[lang] ? xlData[lang] : '';
        });

        if (xlData.strid) {
            foundKey = findKeyByStrId(xlData.strid, curTranslates);
            if (foundKey) {
                bulkOperations.push({
                    updateOne: {
                        filter: { uid: foundKey },
                        update: dataObj
                    }
                });
                return;
            }
        }

        dataObj.uid = key;
        bulkOperations.push({
            insertOne: {
                document: dataObj
            }
        });
        keyNumber = util.getEmptyKeyNumberWithPrevNumber(keyNumber);
        key = pUuid + '_' + keyNumber;
    });

    return bulkOperations;
}

module.exports = {
    create: async(req, res, next) => {
        if (!req.body || !req.body.project || !req.body.uuid) {
            return res.send({'code' : 'nok', 'error' : 'wrong parameter'});
        }

        try {
            const regPattern = `^${req.body.uuid}(.)+`;
            const regEx = new RegExp(regPattern);
            const curTranslates = await translatesModel.find({ uid: regEx }).sort({ uid: 1 }).exec();
            const key = req.body.uuid + '_' + util.getEmptyKeyNumberStr(curTranslates);
            const dataObj = {
                uid : key,
                strid : key,
                tag : req.body.tag ? req.body.tag : ''
            };
            let updateValue = '';

            config.SUPPORT_LANGUAGES.forEach((language) => {
                dataObj[language] = req.body[language] ? req.body[language] : '';
                if (!updateValue) {
                    updateValue = dataObj[language];
                }
            });

            const translate = await translatesModel.create(dataObj);
            logger.recordProjectLog({
                type : 'create_translate',
                request : req,
                projectId : req.body.project,
                updateValue
            });
            await projectsModel.findOneAndUpdate({ uid: req.body.project }, { updateDate: new Date().getTime() }).exec();
            return res.send({ code: 'ok', data: translate });
        } catch (err) {
            return next(err);
        }
    },

    updateById: async(req, res, next) => {
        if (!req.body || !req.params.translateId) {
            return res.send({'code' : 'nok', 'error' : 'wrong parameter'});
        }

        try {
            const dataObj = {
                strid : req.body.strid,
                tag : req.body.tag
            };
            let updateValue = '';

            config.SUPPORT_LANGUAGES.forEach((language) => {
                dataObj[language] = req.body[language] ? req.body[language] : '';
                if (!updateValue) {
                    updateValue = dataObj[language];
                }
            });

            await translatesModel.findOneAndUpdate({ uid: req.params.translateId }, dataObj).exec();
            await projectsModel.findOneAndUpdate({ uid: req.body.project },{ updateDate: new Date().getTime() }).exec();
            logger.recordProjectLog({
                type : 'update_translate',
                request : req,
                projectId : req.body.project,
                updateValue
            });
            return res.send({'code' : 'ok', 'data' : { id: req.params.translateId, locale: dataObj }});
        } catch (err) {
            return next(err);
        }
    },

    deleteById: async(req, res, next) => {
        if (!req.params.translateId) {
            return res.send({'code' : 'nok', 'error' : 'wrong parameter'});
        }

        try {
            const translate = await translatesModel.findOneAndRemove({uid: req.params.translateId}).exec();
            await projectsModel.findOneAndUpdate({ uid: req.query.project }, { updateDate: new Date().getTime() }).exec();

            logger.recordProjectLog({
                type : 'delete_translate',
                request : req,
                projectId : req.query.project,
                updateValue : translate.strid
            });
            return res.send({'code' : 'ok'});
        } catch (err) {
            return next(err);
        }
    },

    getListByFileType: async(req, res, next) => {
        if (!req.query || !req.query.projectName || !req.query.type) {
            return res.send({'code' : 'nok', 'error' : 'wrong parameter'});
        }

        try {
            const project = await projectsModel.findOne({ uid: req.query.projectName }).exec();
            const regPattern = `^${project.uuid}(.)+`;
            const regEx = new RegExp(regPattern);
            const translates = await translatesModel.find({ uid: regEx }).sort({ uid: 1 }).exec();

            if (req.query.type === 'json') {
                const fileName = 'locale_' + req.query.lang + '.json';
                const writeFile = fs.createWriteStream(DOWNLOAD_PATH + fileName);
                const dataJSON = {};

                translates.forEach((translate) => {
                    dataJSON[translate.strid] = translate[req.query.lang] ? translate[req.query.lang] : translate[project.baseLang];
                });
                writeFile.write(JSON.stringify(dataJSON, null, 2), function () {
                    res.writeHead(200, {
                        "Content-Disposition": "attachment;filename=" + fileName
                    });
                    const readStream = fs.createReadStream(DOWNLOAD_PATH + fileName);
                    readStream.pipe(res);
                });
                return;
            }

            if (req.query.type === 'xml') {
                const fileName = 'locale_' + req.query.lang + '.xml';
                const writeFile = fs.createWriteStream(DOWNLOAD_PATH + fileName);
                let text = '<resources>\n';

                translates.forEach((translate) => {
                    text += (translate[req.query.lang] ?
                            ('\t<string name=' + '\"' + translate.strid + '\">' + translate[req.query.lang] + '</string>' + '\n') :
                            ('\t<string name=' + '\"' + translate.strid + '\">' + translate[project.baseLang] + '</string>' + '\n')
                    );
                });
                text += '</resources>';

                writeFile.write(text, function () {
                    res.writeHead(200, {
                        "Content-Disposition": "attachment;filename=" + fileName
                    });
                    const readStream = fs.createReadStream(DOWNLOAD_PATH + fileName);
                    readStream.pipe(res);
                });
                return;
            }

            if (req.query.type === 'xlsx') {
                let languages, strData = {}, strDatas = [];

                if (project.languages) {
                    languages = project.languages.split(',');
                } else {
                    languages = [];
                }

                translates.forEach((translate) => {
                    strData = {};
                    languages.forEach((lang) => {
                        strData[lang] = translate[lang];
                    });
                    strData.strid = translate.strid;
                    strData.tag = translate.tag;
                    strDatas.push(strData);
                });

                const workbook = {
                    SheetNames:["Sheet1"],
                    Sheets:{ Sheet1: xlsx.utils.json_to_sheet(strDatas) }
                };
                xlsx.writeFile(workbook, DOWNLOAD_PATH + 'locale.xlsx');
                res.writeHead(200, {
                    "Content-Disposition": "attachment;filename=" + 'locale.xlsx'
                });
                const readStream = fs.createReadStream(DOWNLOAD_PATH + 'locale.xlsx');
                readStream.pipe(res);
                return;
            }

            if (req.query.type === 'ascii') {
                const fileName = 'Messages_' + req.query.lang + '.properties';
                const writeFile = fs.createWriteStream(DOWNLOAD_PATH + fileName);
                let text = '';

                translates.forEach((translate) => {
                    text += (translate[req.query.lang] ?
                            (translate.strid + '=' + native2ascii(translate[req.query.lang]) + '\n') :
                            (translate.strid + '=' + native2ascii(translate[project.baseLang]) + '\n')
                    );
                });
                writeFile.write(text, function () {
                    res.writeHead(200, {
                        "Content-Disposition": "attachment;filename=" + fileName
                    });
                    const readStream = fs.createReadStream(DOWNLOAD_PATH + fileName);
                    readStream.pipe(res);
                });
                return;
            }

            return res.send({'code' : 'nok'});
        } catch (err) {
            return next(err);
        }
    },

    getSampleFile: function(req, res, next) {
        res.writeHead(200, {
            "Content-Disposition": "attachment;filename=" + 'sample.xlsx'
        });
        const readStream = fs.createReadStream(DOWNLOAD_PATH + 'sample.xlsx');
        readStream.pipe(res);
    },

    createListByExcel: function (req, res, next) {
        if (!req.params.projectId) {
            return res.send({'code' : 'nok', 'error' : 'no projectName exist'});
        }

        const projectName = req.params.projectId;
        const form = new formidable.IncomingForm();
        form.parse(req);

        form.on('fileBegin', function (name, file) {
            file.path = UPLOAD_PATH + file.name;
        });

        form.on('file', async(name, file) => {
            try {
                const excel = xlsx.readFile(UPLOAD_PATH + file.name);
                const sheet_name_list = excel.SheetNames;
                const xlDatas = xlsx.utils.sheet_to_json(excel.Sheets[sheet_name_list[0]]);
                const project = await projectsModel.findOne({ uid: projectName }).exec();
                const regPattern = `^${project.uuid}(.)+`;
                const regEx = new RegExp(regPattern);

                const curTranslates = await translatesModel.find({ uid: regEx }).sort({ uid: 1 }).exec();
                await translatesModel.bulkWrite(buildBulkUpsertOperationsByXlDatas({
                    xlDatas, curTranslates, pUuid: project.uuid
                }));

                logger.recordProjectLog({
                    type : 'upsertlist_by_excel',
                    request : req,
                    projectId : project.uid,
                    updateValue : `upsert count - ${xlDatas.length}`
                });
                await projectsModel.findOneAndUpdate({ uid: project.uid }, { updateDate: new Date().getTime() }).exec();
                return res.send({ code: 'ok' });
            } catch (err) {
                return next(err);
            }
        });

        // form.on('progress', function (byteRead, byteExpected) {
        //     logger.debug(' Reading total ' + byteRead + '/' + byteExpected);
        // });
    },

    getListByKeyword: async(req, res, next) => {
        if (!req.query || !req.query.search) {
            return res.send({'code' : 'nok', 'error' : 'wrong parameter'});
        }

        try {
            const regEx = new RegExp(req.query.search, 'gi');
            const translates = await translatesModel.find({ $or: [ {ko: regEx}, {ja: regEx} ] }).exec();
            const projects = await projectsModel.find({}).exec();
            const sendTranslates = [];

            translates.forEach((translate) => {
                const sendTranslate = JSON.parse(JSON.stringify(translate));
                projects.some((project) => {
                    if (sendTranslate.uid.indexOf(project.uuid) !== -1) {
                        sendTranslate.projectName = project.name;
                        sendTranslate.projectUuid = project.uuid;
                        sendTranslate.projectLanguages = project.languages;
                        return true;
                    }
                    return false;
                });
                sendTranslates.push(sendTranslate);
            });
            return res.send({ code: 'ok', result: sendTranslates });
        } catch (err) {
            return next(err);
        }
    }
}