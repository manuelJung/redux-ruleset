"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var buffer = [];

var addCallback = exports.addCallback = function addCallback(cb) {
  buffer.push(cb);
};

var executeBuffer = exports.executeBuffer = function executeBuffer() {
  if (!buffer.length) return;
  for (var i = 0; i < buffer.length; i++) {
    buffer[i]();
  }
  buffer = [];
};