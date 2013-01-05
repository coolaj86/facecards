/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  function uploadR(req, res, next) {
    console.log(req.files);
    files.forEach(function () {
      // get md5sum
    });
    res.json();
  }

  function create() {
    return uploadR;
  }

  module.exports = create;
}());
