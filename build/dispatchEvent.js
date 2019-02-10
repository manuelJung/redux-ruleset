'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerDispatchListener = registerDispatchListener;
exports.default = dispatchEvent;

var _consequence = require('./consequence');

var _consequence2 = _interopRequireDefault(_consequence);

var _saga = require('./saga');

var saga = _interopRequireWildcard(_saga);

var _ruleDB = require('./ruleDB');

var ruleDB = _interopRequireWildcard(_ruleDB);

var _laterEvents = require('./laterEvents');

var _devTools = require('./devTools');

var devTools = _interopRequireWildcard(_devTools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var executionId = 1;

var dispatchListeners = [];

function registerDispatchListener(cb) {
  dispatchListeners.push(cb);
}

function notifyDispatchListener(action, ruleExecutionId, wasDispatched) {
  if (!dispatchListeners.length) return;
  for (var i = 0; i < dispatchListeners.length; i++) {
    var cb = dispatchListeners[i];
    cb(action, wasDispatched, ruleExecutionId);
  }
}

function dispatchEvent(action, store, cb, isReduxDispatch) {
  var execId = executionId++;
  var ruleExeId = (0, _consequence.getRuleExecutionId)();
  var instead = false;

  if (process.env.NODE_ENV === 'development') {
    devTools.execActionStart(execId, ruleExeId, action);
  }

  saga.applyAction(action, execId);
  ruleDB.forEachRuleContext('INSERT_INSTEAD', action.type, function (context) {
    if (!instead && (0, _consequence2.default)(context, action, store, execId)) instead = true;
  });
  !instead && ruleDB.forEachRuleContext('INSERT_BEFORE', action.type, function (context) {
    return (0, _consequence2.default)(context, action, store, execId);
  });
  var result = instead || !cb ? null : cb();
  if (process.env.NODE_ENV === 'development') {
    devTools.dispatchAction(execId, instead, isReduxDispatch, action);
  }
  notifyDispatchListener(action, ruleExeId, !instead);
  !instead && ruleDB.forEachRuleContext('INSERT_AFTER', action.type, function (context) {
    return (0, _consequence2.default)(context, action, store, execId);
  });
  (0, _laterEvents.executeBuffer)();

  if (process.env.NODE_ENV === 'development') {
    devTools.execActionEnd(execId, ruleExeId, action, instead ? 'ABORTED' : 'DISPATCHED');
  }
  return result;
}