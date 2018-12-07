'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _ruleDB = require('./ruleDB');

var _ruleDB2 = _interopRequireDefault(_ruleDB);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var store = null;
function consequence(context, action, store, _addRule2, _removeRule2) {
  _addRule2 = function addRule(rule) {
    context.childRules.push(rule);return _addRule2(rule);
  };
  _removeRule2 = function removeRule(rule) {
    context.childRules.forEach(_removeRule2);return _removeRule2(rule);
  };
  var rule = context.rule;
  // skip when concurrency matches
  if (rule.concurrency === 'ONCE' && context.running) {
    return false;
  }
  if (rule.concurrency === 'FIRST' && context.running) {
    return false;
  }
  if (rule.addOnce && context.running) {
    return false;
  }
  // skip if 'skipRule' condition matched
  if (action.meta && action.meta.skipRule) {
    var skipRules = Array.isArray(action.meta.skipRule) ? action.meta.skipRule : [action.meta.skipRule];
    if (skipRules[0] === '*' || skipRules.find(function (id) {
      return id === rule.id;
    })) {
      return false;
    }
  }
  // skip if rule condition does not match
  if (rule.condition && !rule.condition(action, store.getState)) {
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
    store = (0, _assign2.default)({}, store, {
      dispatch: function dispatch(action) {
        if (canceled) return action;
        return store.dispatch(action);
      }
    });
    _addRule2 = function _addRule(rule) {
      return !canceled && _addRule2(rule);
    };
    _removeRule2 = function _removeRule(rule) {
      return !canceled && _removeRule2(rule);
    };
  }

  context.running++;
  var result = rule.consequence(store, action, { addRule: _addRule2, removeRule: _removeRule2 });

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

  return true;
}
exports.default = consequence;