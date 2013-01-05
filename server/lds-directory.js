/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var path = require('path')
    , fs = require('fs')
    ;

  module.exports = function () {
    return function (req, res) {
      console.log('typeof req.body', typeof req.body);
      res.json('thanks');
      fs.writeFile(path.join(__dirname, '..', 'var', 'data.bin'), JSON.stringify(req.body));
    };
  };
}());
