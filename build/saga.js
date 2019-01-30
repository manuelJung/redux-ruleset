'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.applyAction = applyAction;
exports.createSaga = createSaga;

var _devTools = require('./devTools');

var devTools = _interopRequireWildcard(_devTools);

var _consequence = require('./consequence');

var _lazyStore = require('./lazyStore');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var listeners = {};

var id = 1;

function applyAction(action) {
  var globalCallbacks = listeners.global;
  var boundCallbacks = listeners[action.type];
  if (globalCallbacks) {
    listeners.global = undefined;
    for (var i = 0; i < globalCallbacks.length; i++) {
      globalCallbacks[i](action);
    }
  }
  if (boundCallbacks) {
    listeners[action.type] = undefined;
    for (var _i = 0; _i < boundCallbacks.length; _i++) {
      boundCallbacks[_i](action);
    }
  }
}

function addListener(target, cb) {
  if (typeof target === 'function') {
    cb = target;
    target = '*';
  } else if (typeof target === 'string') {
    if (target === '*') target = 'global';
    if (!listeners[target]) listeners[target] = [];
    listeners[target] && listeners[target].push(cb);
  } else if (target) {
    for (var i = 0; i < target.length; i++) {
      if (!listeners[target[i]]) listeners[target[i]] = [];
      listeners[target[i]].push(cb);
    }
  }
}

function createSaga(context, saga, cb, store) {
  if (!store) {
    (0, _lazyStore.applyLazyStore)(function (store) {
      return createSaga(context, saga, cb, store);
    });
    return;
  }
  var execId = id++;
  if (process.env.NODE_ENV === 'development') {
    var sagaType = saga === context.rule.addWhen ? 'ADD_WHEN' : 'ADD_UNTIL';
    devTools.execSagaStart(execId, context.rule.id, sagaType);
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
        if (process.env.NODE_ENV === 'development') {
          var _sagaType = saga === context.rule.addWhen ? 'ADD_WHEN' : 'ADD_UNTIL';
          devTools.execSagaEnd(execId, context.rule.id, _sagaType, result.value);
        }
        cb(result.value);
      }
    };
    var action = function action(target, cb) {
      var _addListener = function _addListener() {
        return addListener(target, function (action) {
          var result = cb ? cb(action) : action; // false or mixed
          if (process.env.NODE_ENV === 'development') {
            var _sagaType2 = saga === context.rule.addWhen ? 'ADD_WHEN' : 'ADD_UNTIL';
            var ruleExecId = (0, _consequence.getRuleExecutionId)();
            devTools.yieldSaga(execId, context.rule.id, _sagaType2, action, ruleExecId, result ? 'RESOLVE' : 'REJECT');
          }
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