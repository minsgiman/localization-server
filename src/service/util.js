const util = {
    makeUUID: function() {
        let text = '';
        const possible = 'abcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < 8; i+=1) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return text;
    },
    getClientIp: function(req) {
        let ipAddress = '';

        if (!req) {
            return ipAddress;
        }

        const forwardedIpsStr = req.header('x-forwarded-for'); // The request may be forwarded from local web server.
        if (forwardedIpsStr) {
            const forwardedIps = forwardedIpsStr.split(',');
            ipAddress = forwardedIps[0];
        }

        if (!ipAddress) {
            ipAddress = req.connection.remoteAddress;
        }

        return ipAddress;
    },
    getEmptyKeyNumberStr(keyList) {
        if (!keyList || !keyList.length) {
            return '00001';
        }
        let i, zeroLen, tempStr = '', strKey, key = keyList[keyList.length - 1].uid;

        if (!key) {
            return null;
        }
        strKey = (parseInt(key.split('_')[1], 10) + 1) + '';
        zeroLen = 5 - strKey.length;

        for (i = 0; i < zeroLen; i+=1) {
            tempStr += '0';
        }
        return tempStr + strKey;
    },
    getEmptyKeyNumberWithPrevNumber (numberStr) {
        if (!numberStr) {
            return '00001';
        }
        var i, zeroLen, tempStr = '', strKey = (parseInt(numberStr, 10) + 1) + '';
        zeroLen = 5 - strKey.length;

        for (i = 0; i < zeroLen; i+=1) {
            tempStr += '0';
        }
        return tempStr + strKey;
    }
};

module.exports = util;