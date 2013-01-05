/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
/*
 * SERVER
 */
(function () {
  "use strict";

  var steve = require('./steve')
    , path = require('path')
    , connect = require('connect')
    , mkdirp = require('mkdirp')
    , fs = require('fs')
    , _ = require('underscore')
    , forEachAsync = require('forEachAsync')
    , app = connect.createServer()
    , dNow = new Date()
    ;

  function doQuery(cb, search) {
    // TODO
  }

  function getMeta(req, res) {
    var search = req.query.search
      ;

    doQuery(function (result) {
      res.json(result);
      res.end();
    }, search);
  }

  function putDeck(req, res) {
    var pathname
      ;

    if (!req.body) {
      res.error('no body found');
      res.json();
      return;
    }

    pathname = path.join(__dirname, '..', 'var', 'public', 'decks');
    mkdirp(pathname, function () {
      fs.writeFile(path.join(pathname, req.params.deckId), JSON.stringify(req.body), 'utf8', function () {
        res.json('thanks');
      });
    });
  }

  function router(rest) {
    // handled by static
    //rest.get('/decks/:deckId', getDeck);
    rest.post('/decks/:deckId', putDeck);
    rest.get('/meta', getMeta);
    rest.post('/upload', require('./upload-pic')());
    rest.post('/lds-directory', require('./lds-directory')());
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
