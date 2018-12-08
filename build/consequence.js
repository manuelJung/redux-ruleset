'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

exports.default = consequence;

var _ruleDB = require('./ruleDB');

var _ruleDB2 = _interopRequireDefault(_ruleDB);

var _devTools = require('./devTools');

var devtools = _interopRequireWildcard(_devTools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var store = null;

function consequence(context, action, store, addRule, removeRule, actionId) {
  var _addRule = addRule;
  var _removeRule = removeRule;
  addRule = function addRule(rule) {
    context.childRules.push(rule);return _addRule(rule);
  };
  removeRule = function removeRule(rule) {
    context.childRules.forEach(_removeRule);return _removeRule(rule);
  };
  var rule = context.rule;
  // skip when concurrency matches
  if (rule.concurrency === 'ONCE' && context.running) {
    devtools.executeRule(context, actionId, 'CONCURRENCY');
    return false;
  }
  if (rule.concurrency === 'FIRST' && context.running) {
    devtools.executeRule(context, actionId, 'CONCURRENCY');
    return false;
  }
  if (rule.addOnce && context.running) {
    devtools.executeRule(context, actionId, 'ADD_ONCE');
    return false;
  }
  // skip if 'skipRule' condition matched
  if (action.meta && action.meta.skipRule) {
    var skipRules = Array.isArray(action.meta.skipRule) ? action.meta.skipRule : [action.meta.skipRule];
    if (skipRules[0] === '*' || skipRules.find(function (id) {
      return id === rule.id;
    })) {
      devtools.executeRule(context, actionId, 'SKIP');
      return false;
    }
  }
  // skip if rule condition does not match
  if (rule.condition && !rule.condition(action, store.getState)) {
    devtools.executeRule(context, actionId, 'NO_CONDITION_MATCH');
    return false;
  }

  var cancelCB = function cancelCB() {
    return false;
  };
  var canceled = false;

  if (rule.concurrency === 'LAST') {
    if (context.running) {
      context.cancelRule('consequence');
    }
    cancelCB = function cancelCB() {
      canceled = true;
      return true;
    };
    context.addCancelListener(cancelCB);
    var _store = store;
    store = (0, _assign2.default)({}, store, {
      dispatch: function dispatch(action) {
        if (canceled) return action;
        return _store.dispatch(action);
      }
    });
    var _addRule2 = addRule;
    var _removeRule2 = removeRule;
    addRule = function addRule(rule) {
      return !canceled && _addRule2(rule);
    };
    removeRule = function removeRule(rule) {
      return !canceled && _removeRule2(rule);
    };
  }

  context.running++;
  var result = rule.consequence(store, action, { addRule: addRule, removeRule: removeRule });

  if ((typeof result === 'undefined' ? 'undefined' : (0, _typeof3.default)(result)) === 'object' && result.type) {
    var _action = result;
    store.dispatch(_action);
    rule.concurrency !== 'ONCE' && context.running--;
    rule.addOnce && _ruleDB2.default.removeRule(rule);
    rule.concurrency === 'LAST' && context.removeCancelListener(cancelCB);
  } else if ((typeof result === 'undefined' ? 'undefined' : (0, _typeof3.default)(result)) === 'object' && result.then) {
    var promise = result;
    promise.then(function (action) {
      action && action.type && store.dispatch(action);
      rule.concurrency !== 'ONCE' && context.running--;
      rule.addOnce && _ruleDB2.default.removeRule(rule);
      rule.concurrency === 'LAST' && context.removeCancelListener(cancelCB);
    });
  } else if (typeof result === 'function') {
    _ruleDB2.default.addUnlistenCallback(rule, function () {
      return result(store.getState);
    });
    rule.concurrency !== 'ONCE' && context.running--;
    rule.addOnce && _ruleDB2.default.removeRule(rule);
    rule.concurrency === 'LAST' && context.removeCancelListener(cancelCB);
  }

  devtools.executeRule(context, actionId, 'CONDITION_MATCH');

  return true;
}