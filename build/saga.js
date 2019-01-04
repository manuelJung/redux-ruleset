'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.applyAction = applyAction;
exports.createSaga = createSaga;

var _lazyStore = require('./lazyStore');

var listeners = {};

function applyAction(action) {
  var globalCallbacks = listeners.global;
  var boundCallbacks = listeners[action.type];
  listeners.global = [];
  listeners[action.type] = [];
  globalCallbacks && globalCallbacks.forEach(function (cb) {
    return cb(action);
  });
  boundCallbacks && boundCallbacks.forEach(function (cb) {
    return cb(action);
  });
}

function addListener(target, cb) {
  if (typeof target === 'function') {
    cb = target;
    target = '*';
  }
  if (typeof target === 'string') {
    if (target === '*') target = 'global';
    if (!listeners[target]) listeners[target] = [];
    listeners[target].push(cb);
  } else {
    target && target.forEach(function (target) {
      if (!listeners[target]) listeners[target] = [];
      listeners[target].push(cb);
    });
  }
}

function createSaga(context, saga, cb, store) {
  if (!store) {
    (0, _lazyStore.applyLazyStore)(function (store) {
      return createSaga(context, saga, cb, store);
    });
    return;
  }
  context.pendingSaga = true;
  context.sagaStep = -1;
  var boundStore = store;
  var cancel = function cancel() {};

  var run = function run(gen) {
    var next = function next(iter, payload) {
      context.sagaStep++;
      var result = iter.next(payload);
      if (result.done) {
        context.pendingSaga = false;
        context.off('REMOVE_RULE', cancel);
        cb(result.value);
      }
    };
    var action = function action(target, cb) {
      var _addListener = function _addListener() {
        return addListener(target, function (action) {
          var result = cb ? cb(action) : action; // false or mixed
          if (result) next(iter, result);else _addListener();
        });
      };
      _addListener();
    };
    var iter = gen(action, boundStore.getState);
    cancel = function cancel() {
      iter.return('CANCELED');
      next(iter);
    };
    context.on('REMOVE_RULE', cancel);
    next(iter);
  };

  run(saga);
}