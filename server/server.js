/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
/*
 * SERVER
 */
(function () {
  "use strict";

  var steve = require('./steve')
    , path = require('path')
    , connect = require('connect')
    , _ = require('underscore')
    , forEachAsync = require('forEachAsync')
    , app = connect.createServer()
    , mockData
    , dNow = new Date()
    ;

  mockData = require(path.join('..', 'var', 'mock.json'));

  function doQuery(cb, search) {
    cb(mockData);
  }

  function getMeta(req, res) {
    var search = req.query.search
      ;

    doQuery(function (result) {
      res.json(result);
      res.end();
    }, search);
  }

  function router(rest) {
    rest.get('/meta', getMeta);
    rest.post('/upload', require('./upload-pic')());
  }

  app
    .use(function (req, res, next) {
        // TODO rewrite urls for non-static files
        if (/^images/.test(req.url)) {
          //req.url = req.url.replace()
        }
        next();
      })
    .use(steve)
    .use(connect.multipart())
    //.use(connect.singlepart())
    .use(connect.router(router))
    ;

  module.exports = app;
}());
