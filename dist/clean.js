"use strict";
var util_1 = require('./util');
var fs_extra_1 = require('fs-extra');
function clean(context) {
    context = util_1.generateContext(context);
    var logger = new util_1.Logger('clean');
    try {
        util_1.Logger.debug("clean " + context.wwwDir);
        fs_extra_1.emptyDirSync(context.wwwDir);
        logger.finish();
    }
    catch (e) {
        logger.fail(e, "Error cleaning " + context.wwwDir + ", " + e);
        throw e;
    }
}
exports.clean = clean;
