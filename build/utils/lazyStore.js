'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setStore = setStore;
exports.applyLazyStore = applyLazyStore;


var lazyStore = null;


var callbacks = [];
var i = void 0;

function setStore(store) {
  requestAnimationFrame(function () {
    lazyStore = store;
    callbacks.forEach(function (cb) {
      return cb(store);
    });
    callbacks = [];
  });
}

function applyLazyStore(cb) {
  if (!lazyStore) callbacks.push(cb);else cb(lazyStore);
}