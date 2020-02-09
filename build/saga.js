'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.testing = undefined;
exports.yieldAction = yieldAction;
exports.startSaga = startSaga;

var _types = require('./types');

var t = _interopRequireWildcard(_types);

var _setup = require('./setup');

var setup = _interopRequireWildcard(_setup);

var _utils = require('./utils');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var listeners = {};

var GLOBAL_TYPE = '-global-';

var sagaExecId = 1;

function yieldAction(actionExecution) {
  var globalList = listeners[GLOBAL_TYPE];
  var targetList = listeners[actionExecution.action.type];
  var i = 0;

  if (globalList) for (i = 0; i < globalList.length; i++) {
    globalList[i](actionExecution);
  }if (targetList) for (i = 0; i < targetList.length; i++) {
    targetList[i](actionExecution);
  }
}

function addActionListener(target, ruleContext, cb) {
  var targetList = [];
  if (target === '*') targetList = [GLOBAL_TYPE];else if (typeof target === 'string') targetList = [target];else targetList = target;

  var _loop = function _loop(i) {
    if (!listeners[targetList[i]]) listeners[targetList[i]] = [];
    listeners[targetList[i]].push(cb);
    ruleContext.events.once('SAGA_YIELD', function () {
      (0, _utils.removeItem)(listeners[targetList[i]], cb);
    });
  };

  for (var i = 0; i < targetList.length; i++) {
    _loop(i);
  }
}

function yieldFn(target, condition, ruleContext, onYield) {
  addActionListener(target, ruleContext, function (actionExecution) {
    var result = condition ? condition(actionExecution.action) : actionExecution.action;
    if (result) onYield(result);
  });
}

function startSaga(sagaType, ruleContext, finCb, isReady) {
  if (!isReady) {
    setup.onSetupFinished(function () {
      return startSaga(sagaType, ruleContext, finCb, true);
    });
    return;
  }
  var sagaExecution = {
    execId: sagaExecId++,
    sagaType: sagaType
  };

  var iterate = function iterate(iter, payload) {
    var result = iter.next(payload);
    if (result.done) {
      ruleContext.runningSaga = null;
      ruleContext.events.trigger('SAGA_END', sagaExecution, result.value);
      finCb({ logic: payload === 'CANCELED' || !result.value ? 'CANCELED' : result.value });
    }
  };

  var nextFn = function nextFn(target, condition) {
    yieldFn(target, condition, ruleContext, function (result) {
      ruleContext.events.trigger('SAGA_YIELD', sagaExecution, result);
      iterate(iter, result);
    });
  };

  var cancel = function cancel() {
    ruleContext.events.trigger('SAGA_YIELD', 'CANCELED', sagaType);
    iter.return('CANCELED');
    iterate(iter, 'CANCELED');
  };

  // let's start
  ruleContext.runningSaga = sagaExecution;
  ruleContext.events.trigger('SAGA_START', sagaExecution);
  ruleContext.events.once('REMOVE_RULE', cancel);

  var context = {
    setContext: function setContext(name, value) {
      return ruleContext.publicContext[sagaType][name] = value;
    },
    getContext: function getContext(name) {
      return ruleContext.publicContext.addUntil[name] || ruleContext.publicContext.addWhen[name] || ruleContext.publicContext.global[name];
    }
  };

  var saga = ruleContext.rule[sagaType];
  var args = setup.createSagaArgs({ context: context });
  var iter = void 0;
  if (saga) {
    iter = saga(nextFn, args.getState, args.context);
    iterate(iter);
  }
}

var testing = exports.testing = { addActionListener: addActionListener, listeners: listeners, yieldFn: yieldFn };