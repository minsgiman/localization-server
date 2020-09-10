const winston = require('winston');
const _logWrite = Symbol('logWrite');
const util = require('./util');

class logger {
    constructor () {
        this._logger = null;
        this._projectLogMap = {};
    }

    loggerInit () {
        winston.emitErrs = true;

        function zeroFill (num, digit) {
            if (digit === 2) {
                num = num + '';
                return num.length < 2 ? '0' + num : num;
            } else if (digit === 3) {
                num = num + '';
                if( num.length == 1 ){
                    return '00' + num;
                }else if( num.length == 2 ){
                    return '0' + num;
                }else {
                    return num;
                }
            } else {
                return num;
            }
        }

        function timestampBuilder () {
            const date = new Date();
            const tz = date.getTime() + (date.getTimezoneOffset() * 60000) + (9 * 3600000);
            date.setTime(tz);

            const curr_hour = zeroFill(date.getHours(), 2);
            const curr_min = zeroFill(date.getMinutes(), 2);
            const curr_sec = zeroFill(date.getSeconds(), 2);
            const curr_msec = zeroFill(date.getMilliseconds(), 3);

            return curr_hour+":"+curr_min+":"+curr_sec+"."+curr_msec;
        }

        function logFormatter (options) {
            return '['+ options.timestamp() +' '+ options.level.toUpperCase() +']'+ (undefined !== options.message ? options.message : '') +
                (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
        }

        this._logger = new winston.Logger( {
            transports: [
                new winston.transports.DailyRotateFile( {
                    filename: __dirname + '/../../logs/control_',
                    datePattern: 'yyyy-MM-dd.log',
                    level: 'debug',
                    handleExceptions: true,
                    json: false,
                    colorize: true,
                    maxFiles: 10,
                    maxsize: 1*1024*1024*1024,
                    timestamp: timestampBuilder,
                    formatter: logFormatter
                }),
                new winston.transports.Console({
                    level: 'debug',
                    handleExceptions: true,
                    json: false,
                    colorize: true,
                    timestamp: timestampBuilder,
                    formatter: logFormatter
                })
            ],
            exitOnError: false
        });
    }

    getProjectLog (projectId) {
        return this._projectLogMap[projectId] ? this._projectLogMap[projectId] : [];
    }

    recordProjectLog (logData) {
        const date = new Date();
        const ipAddr = util.getClientIp(logData.request);
        let log = '', updateValue = '';

        if (!this._projectLogMap[logData.projectId]) {
            this._projectLogMap[logData.projectId] = [];
        }

        if (logData.updateValue && logData.updateValue.length > 20) {
            updateValue = (logData.updateValue.substr(0, 20) + '...');
        } else {
            updateValue = logData.updateValue;
        }

        log = '[' + date.toLocaleString() + '] ';
        log += (ipAddr + '에서(' + logData.projectId + ' 프로젝트) ');

        if (logData.type === 'upsertlist') {
            log += (logData.updateLength > 1 ? (updateValue + ' 외 ' + logData.updateLength + '개를 업로드하였습니다.') : (updateValue + ' 를 업로드하였습니다.'));
        } else if (logData.type === 'delete') {
            log += ('\"{key: ' + logData.deleteKey + ', strid: ' + logData.deleteStrId + ', base: ' + logData.deleteBase + '}\" 를 삭제하였습니다.');
        } else if (logData.type === 'update') {
            log += (updateValue + ' 를 업데이트하였습니다.');
        } else if (logData.type === 'create') {
            log += (updateValue + ' 를 생성하였습니다.');
        } else if (logData.type === 'deleteall') {
            log += ('번역어 전체를 삭제하였습니다.');
        }

        this._projectLogMap[logData.projectId].push(log);
        if (this._projectLogMap[logData.projectId].length > 30) {
            this._projectLogMap[logData.projectId].shift();
        }
        this.debug(log);
    }

    debug (msg) {
        this[_logWrite](msg, 'debug');
    }

    info (msg) {
        this[_logWrite](msg, 'info');
    }

    warning (msg) {
        this[_logWrite](msg, 'warning');
    }

    error (msg) {
        this[_logWrite](msg, 'error');
    }

    /******************************** Private *****************************/
    [_logWrite](msg, loglevel) {
        if (this._logger) {
            if (loglevel === 'debug') {
                if (this._logger.debug) {
                    this._logger.debug(msg);
                }
            } else if (loglevel === 'info') {
                if (this._logger.info) {
                    this._logger.info(msg);
                }
            } else if (loglevel === 'warning') {
                if (this._logger.warningLog) {
                    this._logger.warningLog(msg);
                }
            } else if (loglevel === 'error') {
                if (this._logger.error) {
                    this._logger.error(msg);
                }
            }
        }
    }
}

module.exports = new logger();