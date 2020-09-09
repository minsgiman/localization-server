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
    getByProject: function(req, res, next) {
        logger.debug('translateList getByProject');

        if (!req.query || !(req.query.projectUUID || req.query.projectName)) {
            res.send({'code' : 'nok'});
            return;
        }

        if (req.query.projectName) {
            projectsModel.find({uid: req.query.projectName}, function(err, project){
                if (err) {
                    next(err);
                    return;
                }

                const updateDateParam = req.query.updateDate ? parseInt(req.query.updateDate, 10) : -1;
                if (updateDateParam >= project.updateDate) {
                    res.send({'code' : 'nok', 'msg' : 'notting updated'});
                    return;
                }

                const regPattern = `^${project.uuid}(.)+`;
                const regEx = new RegExp(regPattern);
                translatesModel.find({ uid: regEx }, function(err, translates){
                    if (err) {
                        next(err);
                        return;
                    }

                    let map, tag, tags = {'': true}, languages, translate, dataJSON = {updateDate: project.updateDate, tags: []};

                    /*** find all tags ***/
                    for (translate of translates) {
                        if (translate.tag) {
                            tags[translate.tag] = true;
                        }
                    }
                    /*** make tags lang Map ***/
                    if (project.languages) {
                        languages = project.languages.split(',');
                    } else {
                        languages = [];
                    }
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
                            if (translate[language]) {
                                map.itemMap[translate.strid] = translate[language];
                                map.keys.push(translate.strid);
                            } else {
                                map.itemMap[translate.strid] = translate[project.baseLang];
                                map.keys.push(translate.strid);
                            }
                        });
                    }
                    dataJSON.code = 'ok';
                    res.send(dataJSON);
                });
            });
            return;
        }

        if (req.query.projectUUID) {
            const regPattern = `^${req.query.projectUUID}(.)+`;
            const regEx = new RegExp(regPattern);

            translatesModel.find({ uid: regEx }, function(err, translates){
                if (err){
                    next(err);
                } else{
                    res.send({'code' : 'ok', 'result' : translates});
                }
            });
        }
    },

    createByMap: function(req, res, next) {
        logger.debug('translateList createByMap');

        if (!req.body || !req.body.projectName || !req.body.locale || !req.body.itemMap) {
            res.send({'code' : 'nok', 'error' : 'wrong parameter'});
            return;
        }

        const pProjectName = req.body.projectName,
            pLocale = req.body.locale,
            pItemMap = req.body.itemMap,
            pTag = req.body.tag;

        projectsModel.find({uid: pProjectName}, function (err, project) {
            if (err) {
                next(err);
                return;
            }

            if (!project || !project.uuid) {
                res.send({'code' : 'nok', 'error' : 'no project exist'});
                return;
            }

            let itemKey, upsertStrings = [], items = (typeof pItemMap === 'string' ? JSON.parse(pItemMap) : pItemMap);
            const regPattern = `^${project.uuid}(.)+`;
            const regEx = new RegExp(regPattern);

            for (itemKey in items) {
                upsertStrings.push({
                    stringid : itemKey,
                    data : items[itemKey]
                });
            }
            translatesModel.find({ uid: regEx }, function(err, curTranslates){
                if (err){
                    next(err);
                    return;
                }

                translatesModel.bulkWrite(buildBulkUpsertOperations({
                    curTranslates, upsertStrings, project, pLocale, pTag
                }), function (err, result) {
                    if (err) {
                        next(err);
                        return;
                    }

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
    },

    deleteByKeys: function(req, res, next) {
        logger.debug('translateList deleteByKeys');

        if (!req.body || !req.body.projectName || !req.body.keys) {
            res.send({'code' : 'nok', 'error' : 'wrong parameter'});
            return;
        }

        if (typeof req.body.keys === 'string') {
            req.body.keys = JSON.parse(req.body.keys);
        }
        projectsModel.find({uid: req.body.projectName}, function (err, project) {
            if (err) {
                next(err);
                return;
            }

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

            translatesModel.bulkWrite(bulkOperations, function (err, result) {
                if (err) {
                    next(err);
                    return;
                }

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
    }
};
