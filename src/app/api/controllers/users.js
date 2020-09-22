const userModel = require('../models/users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = {
    me: async(req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader ? authHeader.split(" ")[1] : null;

        if (!token) {
            return res.send({'code' : 'nok', 'error': 'need login'});
        }
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, user) {
            if (err) {
                return res.send({'code' : 'nok', 'error': 'not valid'});
            }
            res.send({'code' : 'ok', 'user' : user});
        });
    },
    create: async(req, res, next) => {
        if (!req.body || !req.body.id || !req.body.password) {
            return res.send({'code' : 'nok', 'error' : 'wrong parameter'});
        }

        try {
            await userModel.create({ id: req.body.id, password: req.body.password, admin: !!req.body.admin });
            return res.send({ code: 'ok' });
        } catch(err) {
            return next(err);
        }
    },
    authenticate: async(req, res, next) => {
        if (!req.body || !req.body.id || !req.body.password) {
            return res.send({'code' : 'nok', 'error' : 'wrong parameter'});
        }

        try {
            const user = await userModel.findOne({id: req.body.id}).exec();
            if (user && bcrypt.compareSync(req.body.password, user.password)) {
                const token = jwt.sign({
                    id: user.id,
                    password: user.password,
                    admin: user.admin
                }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15s' });
                return res.send({ code: 'ok', user: {id: user.id, admin: user.admin}, token: token });
            }
            return res.send({ code: 'nok', message: 'Invalid id or password' });
        } catch(err) {
            return next(err);
        }
    }
}