'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

exports.default = consequence;

var _ruleDB = require('./ruleDB');

var _ruleDB2 = _interopRequireDefault(_ruleDB);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var store = null;
function consequence(rule, action, store) {
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

  var result = rule.consequence(store, action);

  if ((typeof result === 'undefined' ? 'undefined' : (0, _typeof3.default)(result)) === 'object' && result.type) {
    var _action = result;
    store.dispatch(_action);
  } else if ((typeof result === 'undefined' ? 'undefined' : (0, _typeof3.default)(result)) === 'object' && result.then) {
    var promise = result;
    promise.then(function (action) {
      return action && action.type && store.dispatch(action);
    });
  } else if (typeof result === 'function') {
    _ruleDB2.default.addUnlistenCallback(rule, function () {
      return result(store.getState);
    });
  }

  if (rule.addOnce) {
    _ruleDB2.default.removeRule(rule);
  }

  return true;
}