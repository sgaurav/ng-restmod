//server.js
/* global require, process */
/*jshint devel:true */

'use strict';
var express = require('express');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var app = express();

app.set('port', process.env.PORT || 3000);
app.set('view engine', 'jade');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static(path.join(__dirname, '/')));

app.get('/', function(req, res, next){
  res.sendFile(__dirname + '/index.html', function(err){
    if(err) {
      console.log('error:', err);
      next(err);
    }
  });
});

app.get('/employee/:id', function(req, res, next){
    var id = req.params.id;
    var query = req.query;
    query.id = id;
    res.send(200, query);
});

app.get('/employee', function(req, res, next){
    var params = req.query;
    res.send(200, [{Id: 1, name: 'gaurav'}, {Id: 2, name: 'sushant'}]);
});

app.post('/employee', function(req, res, next){
    var params = req.body;
    res.send(200, params);
});

app.put('/employee/:id', function(req, res, next){
    var params = req.query;
    res.send(200, params);
});

app.delete('/employee/:id', function(req, res, next){
  res.status(200).send({status: 'OK'});
})

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});