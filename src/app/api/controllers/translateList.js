const translatesModel = require('../models/translates');
const projectsModel = require('../models/projects');
const logger = require('../../../service/logger');
const util = require('../../../service/util');

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

function buildBulkUpsertOperations(paramObj) {
    const curTranslates = paramObj.curTranslates, upsertStrings = paramObj.upsertStrings,
        project = paramObj.project, pLocale = paramObj.pLocale, pTag = paramObj.pTag;
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

module.exports = {
    getByProject: async(req, res, next) => {
        logger.debug('translateList getByProject');

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

                const translates = await translatesModel.find({ uid: regEx }).exec();
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
        logger.debug('translateList createByMap');

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
            const curTranslates = await translatesModel.find({ uid: regEx }).exec();

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
            return res.send({ code: 'ok' });
        } catch (err) {
            return next(err);
        }
    },

    deleteByKeys: async(req, res, next) => {
        logger.debug('translateList deleteByKeys');

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
            return res.send({ code: 'ok' });
        } catch (err) {
            return next(err);
        }
    }
};
