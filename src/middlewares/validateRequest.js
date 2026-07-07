const httpError = require("../utils/httpError");

function requireFields(fields) {
    return function validateFields(req, res, next) {
        const missingFields = fields.filter((field) => {
            const value = req.body[field];
            return value === undefined || value === null || value === "";
        });

        if (missingFields.length > 0) {
            return next(httpError(400, "Faltan campos obligatorios", missingFields));
        }

        return next();
    };
}

module.exports = {
    requireFields
};
