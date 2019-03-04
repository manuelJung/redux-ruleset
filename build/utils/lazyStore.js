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
  /*
  this method will be called after the store is available
  but BEFORE the middlewares are added 
  when we create a rule with no target that dispatches an event
  it is not possible to react to it, because the middelware wasn't added yet
  we overcome this problem by wrapping it in a timeout, but this is not ideal
  */
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