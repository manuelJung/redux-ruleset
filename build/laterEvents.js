"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var buffer = {};
var added = 0;

var addCallback = exports.addCallback = function addCallback(actionExecId, cb) {
  if (!buffer[actionExecId]) buffer[actionExecId] = [];
  buffer[actionExecId].push(cb);
  added++;
};

var executeBuffer = exports.executeBuffer = function executeBuffer(actionExecId) {
  var list = buffer[actionExecId];
  if (!list && !buffer[0]) return;
  if (list) {
    for (var i = 0; i < list.length; i++) {
      list[i]();
      added--;
    }
    buffer[actionExecId] = [];
  }
  if (buffer[0] && buffer[0].length) {
    for (var _i = 0; _i < buffer[0].length; _i++) {
      buffer[0][_i]();
      added--;
    }
    buffer[0] = [];
  }
  if (added === 0) {
    buffer = {};
  }
};

var executeAllBuffer = exports.executeAllBuffer = function executeAllBuffer() {
  for (var id in buffer) {
    executeBuffer(id);
  }
};