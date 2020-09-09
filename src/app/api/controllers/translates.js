const translatesModel = require('../models/translates');
const projectsModel = require('../models/projects');
const logger = require('../../../service/logger');
const util = require('../../../service/util');
const config = require('../../config');
const fs = require('fs');
const xlsx = require('xlsx');
const native2ascii = require('node-native2ascii');

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

function buildBulkUpsertOperations(params) {
    const xlDatas = params.xlDatas, curTranslates = params.curTranslates,
        baseLang = params.baseLang, pUuid = params.pUuid;
    const bulkOperations = [];
    let keyNumber = util.getEmptyKeyNumberStr(curTranslates),
        key = pUuid + '_' + keyNumber, foundKey;

    xlDatas.forEach((xlData) => {
        const dataObj = {
            strid: xlData.strid ? xlData.strid : key,
            base: xlData[baseLang] ? xlData[baseLang] : '',
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
            } else {
                dataObj.uid = key;
                bulkOperations.push({
                    insertOne: {
                        document: dataObj
                    }
                });
            }
            return;
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
    create: function(req, res, next) {
        logger.debug('translates create');

        if (!req.body || !req.body.base || !req.body.project || !req.body.uuid) {
            res.send({'code' : 'nok', 'error' : 'wrong parameter'});
            return;
        }

        const regPattern = `^${req.body.uuid}(.)+`;
        const regEx = new RegExp(regPattern);

        translatesModel.find({ uid: regEx }, function(err, curTranslates) {
            if (err) {
                next(err);
                return;
            }

            const key = req.body.uuid + '_' + util.getEmptyKeyNumberStr(curTranslates);
            const dataObj = {
                uid : key,
                strid : key,
                base : req.body.base,
                tag : req.body.tag ? req.body.tag : ''
            };

            config.SUPPORT_LANGUAGES.forEach((language) => {
                dataObj[language] = req.body[language] ? req.body[language] : '';
            });

            translatesModel.create(dataObj, function (err, translate) {
                if (err) {
                    next(err);
                    return;
                }

                logger.recordProjectLog({
                    type : 'create',
                    request : req,
                    projectId : req.body.project,
                    updateValue : req.body.base
                });
                projectsModel.findOneAndUpdate({uid: req.body.project}, {
                    updateDate: new Date().getTime()
                }, function(err, project){
                    if (err) {
                        next(err);
                        return;
                    }
                    res.send({ code: 'ok' });
                });
            });
        });
    },

    updateById: function(req, res, next) {
        logger.debug('translates updateById');

        if (!req.body || !req.body.base || !req.params.translateId) {
            res.send({'code' : 'nok', 'error' : 'wrong parameter'});
            return;
        }

        const dataObj = {
            base : req.body.base,
            strid : req.body.strid,
            tag : req.body.tag
        };

        config.SUPPORT_LANGUAGES.forEach((language) => {
            dataObj[language] = req.body[language] ? req.body[language] : '';
        });

        translatesModel.findOneAndUpdate({uid: req.params.translateId}, dataObj, function(err, translate){
            if (err) {
                next(err);
                return;
            }

            projectsModel.findOneAndUpdate({uid: req.body.project},{
                updateDate: new Date().getTime()
            }, function(err, project){
                if (err) {
                    next(err);
                    return;
                }

                logger.recordProjectLog({
                    type : 'update',
                    request : req,
                    projectId : req.body.project,
                    updateValue : req.body.base
                });
                res.send({'code' : 'ok', 'data' : {id: req.params.translateId, locale: dataObj}});
            });
        });
    },

    deleteById: function(req, res, next) {
        logger.debug('translates deleteById');

        if (!req.params.translateId) {
            res.send({'code' : 'nok', 'error' : 'wrong parameter'});
            return;
        }

        translatesModel.findOneAndRemove({uid: req.params.translateId}, function(err, translate){
            if (err) {
                next(err);
                return;
            }

            projectsModel.findOneAndUpdate({uid: req.body.project}, {
                updateDate: new Date().getTime()
            }, function(err, project){
                if (err) {
                    next(err);
                    return;
                }

                logger.recordProjectLog({
                    type : 'delete',
                    request : req,
                    projectId : req.body.project,
                    deleteKey : req.params.translateId,
                    deleteStrId : translate.strid,
                    deleteBase : translate.base
                });
                res.send({'code' : 'ok'});
            });
        });
    },

    getListByFileType: function(req, res, next) {
        logger.debug('translates getListByFileType');

        if (!req.query || !req.query.projectName || !req.query.type) {
            res.send({'code' : 'nok', 'error' : 'wrong parameter'});
            return;
        }

        projectsModel.find({ uid: req.query.projectName }, function (err, project) {
            if (err) {
                next(err);
                return;
            }

            const regPattern = `^${project.uuid}(.)+`;
            const regEx = new RegExp(regPattern);

            translatesModel.find({ uid: regEx }, function(err, translates) {
                if (err) {
                    next(err);
                    return;
                }

                if (req.query.type === 'json') {
                    const writeFile = fs.createWriteStream('./locale_' + req.query.lang + '.json');
                    const dataJSON = {};

                    translates.forEach((translate) => {
                        dataJSON[translate.strid] = translate[req.query.lang] ? translate[req.query.lang] : translate.base;
                    });
                    writeFile.write(JSON.stringify(dataJSON, null, 2), function () {
                        res.writeHead(200, {
                            "Content-Disposition": "attachment;filename=" + 'locale_' + req.query.lang + '.json'
                        });
                        const readStream = fs.createReadStream('./locale_' + req.query.lang + '.json');
                        readStream.pipe(res);
                    });
                    return;
                }

                if (req.query.type === 'xml') {
                    const writeFile = fs.createWriteStream('./locale_' + req.query.lang + '.xml');
                    let text = '<resources>\n';

                    translates.forEach((translate) => {
                        text += (translate[req.query.lang] ?
                                ('\t<string name=' + '\"' + translate.strid + '\">' + translate[req.query.lang] + '</string>' + '\n') :
                                ('\t<string name=' + '\"' + translate.strid + '\">' + translate.base + '</string>' + '\n')
                            );
                    });
                    text += '</resources>';

                    writeFile.write(text, function () {
                        res.writeHead(200, {
                            "Content-Disposition": "attachment;filename=" + 'locale_' + req.query.lang + '.xml'
                        });
                        const readStream = fs.createReadStream('./locale_' + req.query.lang + '.xml');
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
                    xlsx.writeFile(workbook, 'locale.xlsx');
                    res.writeHead(200, {
                        "Content-Disposition": "attachment;filename=" + 'locale.xlsx'
                    });
                    const readStream = fs.createReadStream('locale.xlsx');
                    readStream.pipe(res);
                    return;
                }

                if (req.query.type === 'ascii') {
                    const writeFile = fs.createWriteStream('./Messages_' + req.query.lang + '.properties');
                    let text = '';

                    translates.forEach((translate) => {
                        text += (translate[req.query.lang] ?
                                (translate.strid + '=' + native2ascii(translate[req.query.lang]) + '\n') :
                                (translate.strid + '=' + native2ascii(translate.base) + '\n')
                        );
                    });
                    writeFile.write(text, function () {
                        res.writeHead(200, {
                            "Content-Disposition": "attachment;filename=" + 'Messages_' + req.query.lang + '.properties'
                        });
                        const readStream = fs.createReadStream('./Messages_' + req.query.lang + '.properties');
                        readStream.pipe(res);
                    });
                    return;
                }

                res.send({'code' : 'nok'});
            });
        });
    },

    createListByExcel: function(req, res, next) {
        logger.debug('translates createListByExcel');

        const form = new formidable.IncomingForm();
        form.parse(req);

        form.on('fileBegin', function (name, file) {
            file.path = __dirname + '/' + file.name;
        });

        form.on('file', function (projectName, file) {
            const excel = xlsx.readFile(file.name);
            const sheet_name_list = excel.SheetNames;
            const xlDatas = xlsx.utils.sheet_to_json(excel.Sheets[sheet_name_list[0]]);

            projectsModel.find({ uid: projectName }, function (err, project) {
                if (err) {
                    next(err);
                    return;
                }

                const regPattern = `^${project.uuid}(.)+`;
                const regEx = new RegExp(regPattern);
                const baseLang = project.baseLang ? project.baseLang : config.BASE_LANGUAGE;

                translatesModel.find({uid: regEx}, function (err, curTranslates) {
                    if (err) {
                        next(err);
                        return;
                    }

                    translatesModel.bulkWrite(buildBulkUpsertOperations({
                        xlDatas,
                        curTranslates,
                        baseLang,
                        pUuid: project.uuid
                    }), function (err, result) {
                        if (err) {
                            next(err);
                            return;
                        }

                        logger.recordProjectLog({
                            type : 'upsertlist',
                            request : req,
                            projectId : project.uid,
                            updateValue : xlDatas[0] ? xlDatas[0][baseLang] : '',
                            updateLength : xlDatas.length
                        });
                        projectsModel.findOneAndUpdate({uid: project.uid}, {
                            updateDate: new Date().getTime()
                        }, function(err, project){
                            if (err) {
                                next(err);
                                return;
                            }
                            res.send({
                                code: 'ok'
                            });
                        });
                    });
                });
            });
        });
        // form.on('progress', function (byteRead, byteExpected) {
        //     logger.debug(' Reading total ' + byteRead + '/' + byteExpected);
        // });
    },

    getSampleFile: function(req, res, next) {
        logger.debug('translates getSampleFile');

        res.writeHead(200, {
            "Content-Disposition": "attachment;filename=" + 'sample.xlsx'
        });
        const readStream = fs.createReadStream('./sample.xlsx');
        readStream.pipe(res);
    },

    getListByKeyword: function(req, res, next) {
        logger.debug('translates getListByKeyword');

        if (!req.query || !req.query.search) {
            res.send({'code' : 'nok', 'error' : 'wrong parameter'});
            return;
        }

        const regEx = new RegExp(req.query.search, 'gi');
        translatesModel.find({ $or: [ {base: regEx}, {ko: regEx} ] }, function(err, translates) {
            if (err) {
                next(err);
                return;
            }

            projectsModel.find({}, function (err, projects) {
                if (err) {
                    next(err);
                    return;
                }

                const sendTranslates = [];

                translates.forEach((translate) => {
                    projects.some((project) => {
                        if (translate.uid.indexOf(project.uuid) !== -1) {
                            translate.projectName = project.name;
                            translate.projectUuid = project.uuid;
                            translate.projectLanguages = projects.languages;
                            return true;
                        }
                        return false;
                    });
                    sendTranslates.push(translate);
                });
                res.send({
                    code: 'ok',
                    result: sendTranslates
                });
            });
        });
    }
}