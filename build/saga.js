'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.setStore = setStore;
exports.applyAction = applyAction;
exports.createSaga = createSaga;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
  var gen = function gen(target, cb) {
    return new _promise2.default(function (resolve) {
      var next = function next() {
        return addListener(target, function (action) {
          var result = cb && cb(action);
          result ? resolve(result) : next();
        });
      };
      next();
    });
  };
  gen.ofType = function (type) {
    return gen(type, function (action) {
      return action.type === type;
    });
  };
  saga(gen, store.getState).then(cb);
}