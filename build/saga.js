'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setStore = setStore;
exports.applyAction = applyAction;
exports.createSaga = createSaga;


var store = null;

var initialSagas = [];
var listeners = {};

function setStore(_store) {
  store = _store;
  if (initialSagas.length) {
    initialSagas.forEach(function (saga) {
      return saga();
    });
    initialSagas = [];
  }
}

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

function createSaga(saga, cb) {
  if (!store) {
    initialSagas.push(function () {
      return createSaga(saga, cb);
    });
    return;
  }
  var run = function run(gen) {
    var next = function next(iter, payload) {
      var result = iter.next(payload);
      if (result.done) cb(result.value);
    };
    var action = function action(target, cb) {
      var _addListener = function _addListener() {
        return addListener(target, function (action) {
          var result = cb(action); // false or mixed
          if (result) next(iter, result);else _addListener();
        });
      };
      _addListener();
    };
    action.ofType = function (type) {
      return action(type, function (action) {
        return action.type === type;
      });
    };
    var iter = gen(action);
    next(iter);
  };
  run(saga);
}