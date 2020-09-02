const util = {
    makeUUID: function() {
        let text = '';
        const possible = 'abcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < 8; i+=1) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return text;
    }
};

module.exports = util;