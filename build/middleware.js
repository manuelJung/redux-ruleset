'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = middleware;
exports.addRule = addRule;
exports.removeRule = removeRule;

var _ruleDB = require('./ruleDB');

var _ruleDB2 = _interopRequireDefault(_ruleDB);

var _saga = require('./saga');

var saga = _interopRequireWildcard(_saga);

var _consequence = require('./consequence');

var _consequence2 = _interopRequireDefault(_consequence);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var laterAddedRules = [];
function middleware(store) {
  saga.setStore(store);
  return function (next) {
    return function (action) {
      var instead = false;
      saga.applyAction(action);
      _ruleDB2.default.forEachRule('INSERT_INSTEAD', action.type, function (rule) {
        if (!instead && (0, _consequence2.default)(rule, action, store)) instead = true;
      });
      !instead && _ruleDB2.default.forEachRule('INSERT_BEFORE', action.type, function (rule) {
        return (0, _consequence2.default)(rule, action, store);
      });
      var result = instead ? null : next(action);
      !instead && _ruleDB2.default.forEachRule('INSERT_AFTER', action.type, function (rule) {
        return (0, _consequence2.default)(rule, action, store);
      });
      if (laterAddedRules.length) {
        laterAddedRules.forEach(function (cb) {
          return cb();
        });
        laterAddedRules = [];
      }
      return result;
    };
  };
}

function addRule(rule) {
  var add = function add() {
    _ruleDB2.default.addRule(rule);
    if (rule.addUntil) addUntil();
  };
  var remove = function remove() {
    _ruleDB2.default.removeRule(rule);
    return true;
  };
  var addWhen = function addWhen() {
    return rule.addWhen && saga.createSaga(rule.addWhen, function (result) {
      switch (result) {
        case 'ADD_RULE':
          laterAddedRules.push(add);break;
        case 'ADD_RULE_BEFORE':
          add();break;
        case 'ABORT':
          break;
        case 'REAPPLY_WHEN':
          addWhen();break;
      }
    });
  };
  var addUntil = function addUntil() {
    return rule.addUntil && saga.createSaga(rule.addUntil, function (result) {
      switch (result) {
        case 'RECREATE_RULE':
          remove() && addRule(rule);break;
        case 'REMOVE_RULE':
          remove();break;
        case 'REAPPLY_REMOVE':
          addUntil();break;
        case 'ABORT':
          break;
      }
    });
  };
  if (rule.addWhen) {
    addWhen();
  } else {
    add();
  }
  return rule;
}

function removeRule(rule) {
  _ruleDB2.default.removeRule(rule);
  return rule;
}

/**
ruleset: generate id
action: generate id
ruleExecution: actionId, ruleId, generate id
ruleAction: generate id, ruleExecId
action: throw
 */