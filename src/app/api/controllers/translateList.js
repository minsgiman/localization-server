const translatesModel = require('../models/translates');
const projectsModel = require('../models/projects');
const logger = require('../../../service/logger');
const util = require('../../../service/util');
const config = require('../../config');
const formidable = require('formidable');
const xlsx = require('xlsx');

const UPLOAD_PATH = process.env.UPLOAD_PATH;

function findTagMap (map, lang, tag) {
    const tagValue = tag ? tag : '', len = map.length;
    let i;

    for (i = 0; i < len; i+=1) {
        if (map[i].tag === tagValue && map[i].locale === lang) {
            return map[i];
        }
    }
    return null;
}

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

function buildBulkUpsertOperations({curTranslates, upsertStrings, project, pLocale, pTag}) {
    const translateMap = {}, bulkOperations = [];
    let curKeyNumber = util.getEmptyKeyNumberStr(curTranslates);

    curTranslates.forEach((translate) => {
        translateMap[translate.strid] = translate;
    });

    upsertStrings.forEach((string) => {
        let updateObj = null, insertObj = null;

        if (translateMap[string.stringid]) {
            updateObj = {};
            updateObj[pLocale] = string.data;
            if (pLocale === project.baseLang) {
                updateObj.base = string.data;
            }
            updateObj.tag = pTag ? pTag : '';

            bulkOperations.push({
                updateOne: {
                    filter: { uid: translateMap[string.stringid].uid },
                    update: updateObj
                }
            });
        } else {
            insertObj = {
                uid: project.uuid + '_' + curKeyNumber,
                base: (pLocale === project.baseLang) ? string.data : '',
                strid: string.stringid,
                tag: pTag ? pTag : '',
                ko : '',
                ja : '',
                en : '',
                zh : '',
                de : '',
                es : '',
            };
            insertObj[pLocale] = string.data;

            bulkOperations.push({
                insertOne: {
                    document: insertObj
                }
            });
            curKeyNumber = util.getEmptyKeyNumberWithPrevNumber(curKeyNumber)
        }
    });

    return bulkOperations;
}

function buildBulkUpsertOperationsByXlDatas({xlDatas, curTranslates, baseLang, pUuid}) {
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
    getByProject: async(req, res, next) => {
        if (!req.query || !(req.query.projectUUID || req.query.projectName)) {
            return res.send({ 'code' : 'nok' });
        }

        if (req.query.projectName) {
            try {
                const project = await projectsModel.findOne({uid: req.query.projectName}).exec();
                const regPattern = `^${project.uuid}(.)+`;
                const regEx = new RegExp(regPattern);
                const updateDateParam = req.query.updateDate ? parseInt(req.query.updateDate, 10) : -1;

                if (updateDateParam >= project.updateDate) {
                    return res.send({'code' : 'nok', 'msg' : 'notting updated'});
                }

                const translates = await translatesModel.find({ uid: regEx }).sort({ uid: 1 }).exec();
                let map, tag, tags = {'': true}, languages, translate,
                    dataJSON = {code: 'ok', updateDate: project.updateDate, tags: []};

                /*** find all tags ***/
                for (translate of translates) {
                    if (translate.tag) {
                        tags[translate.tag] = true;
                    }
                }
                /*** make tags lang Map ***/
                languages = project.languages ? project.languages.split(',') : [];
                languages.forEach((language) => {
                    for (tag in tags) {
                        dataJSON.tags.push({
                            tag : tag,
                            locale : language,
                            itemMap : {},
                            keys : [],
                            base : language === project.baseLang
                        });
                    }
                });
                /*** Fill tags lang Map ***/
                translates.sort(function (a, b) {
                    let aLabel, bLabel;
                    aLabel = (a.strid) ? a.strid.toLowerCase() : '';
                    bLabel = (b.strid) ? b.strid.toLowerCase() : '';
                    return aLabel < bLabel ? -1 : aLabel > bLabel ? 1 : 0;
                });
                for (translate of translates) {
                    languages.forEach((language) => {
                        map = findTagMap(dataJSON.tags, language, translate.tag);
                        map.itemMap[translate.strid] = translate[language] ? translate[language] : translate[project.baseLang];
                        map.keys.push(translate.strid);
                    });
                }
                return res.send(dataJSON);
            } catch (err) {
                return next(err);
            }
        }

        if (req.query.projectUUID) {
            try {
                const regPattern = `^${req.query.projectUUID}(.)+`;
                const regEx = new RegExp(regPattern);
                const translates = await translatesModel.find({ uid: regEx }).exec();

                return res.send({'code' : 'ok', 'result' : translates});
            } catch (err) {
                return next(err);
            }
        }
    },

    createByMap: async(req, res, next) => {
        if (!req.body || !req.body.projectName || !req.body.locale || !req.body.itemMap) {
            return res.send({'code' : 'nok', 'error' : 'wrong parameter'});
        }

        const pProjectName = req.body.projectName, pLocale = req.body.locale,
            pItemMap = req.body.itemMap, pTag = req.body.tag;

        try {
            const project = await projectsModel.findOne({uid: pProjectName}).exec();
            if (!project || !project.uuid) {
                return res.send({'code' : 'nok', 'error' : 'no project exist'});
            }

            let itemKey, upsertStrings = [], items = (typeof pItemMap === 'string' ? JSON.parse(pItemMap) : pItemMap);
            const regPattern = `^${project.uuid}(.)+`;
            const regEx = new RegExp(regPattern);
            const curTranslates = await translatesModel.find({ uid: regEx }).sort({ uid: 1 }).exec();

            for (itemKey in items) {
                upsertStrings.push({
                    stringid : itemKey,
                    data : items[itemKey]
                });
            }
            await translatesModel.bulkWrite(buildBulkUpsertOperations({
                curTranslates, upsertStrings, project, pLocale, pTag
            }));
            await projectsModel.findOneAndUpdate({ uid: project.uid }, { updateDate: new Date().getTime() }).exec();
            logger.recordProjectLog({
                type : 'create_translates_by_map',
                request : req,
                projectId : project.uid,
                updateValue : `upsert count - ${upsertStrings.length}`
            });
            return res.send({ code: 'ok' });
        } catch (err) {
            return next(err);
        }
    },

    deleteByKeys: async(req, res, next) => {
        if (!req.body || !req.body.projectName || !req.body.keys) {
            return res.send({'code' : 'nok', 'error' : 'wrong parameter'});
        }
        if (typeof req.body.keys === 'string') {
            req.body.keys = JSON.parse(req.body.keys);
        }

        try {
            const project = await projectsModel.findOne({uid: req.body.projectName}).exec();
            const bulkOperations = [];
            const regPattern = `^${project.uuid}(.)+`;
            const regEx = new RegExp(regPattern);

            req.body.keys.forEach((key) => {
                bulkOperations.push({
                    deleteOne: {
                        filter: { uid: regEx, strid: key },
                    }
                });
            });
            await translatesModel.bulkWrite(bulkOperations);
            await projectsModel.findOneAndUpdate({ uid: project.uid }, { updateDate: new Date().getTime() });
            logger.recordProjectLog({
                type : 'delete_translates_by_keys',
                request : req,
                projectId : project.uid,
                updateValue : `delete count - ${bulkOperations.length}`
            });
            return res.send({ code: 'ok' });
        } catch (err) {
            return next(err);
        }
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
                const baseLang = project.baseLang ? project.baseLang : config.BASE_LANGUAGE;

                const curTranslates = await translatesModel.find({ uid: regEx }).sort({ uid: 1 }).exec();
                await translatesModel.bulkWrite(buildBulkUpsertOperationsByXlDatas({
                    xlDatas, curTranslates, baseLang, pUuid: project.uuid
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
    }
};
