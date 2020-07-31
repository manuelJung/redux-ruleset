'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.testing = undefined;

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

exports.activateSubRule = activateSubRule;
exports.default = registerRule;
exports.dropRule = dropRule;

var _types = require('./types');

var t = _interopRequireWildcard(_types);

var _utils = require('./utils');

var _saga = require('./saga');

var _ruleDB = require('./ruleDB');

var _globalEvents = require('./globalEvents');

var _globalEvents2 = _interopRequireDefault(_globalEvents);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var registeredDict = {};


var startAddWhen = function startAddWhen(context) {
  return (0, _saga.startSaga)('addWhen', context, function (result) {
    var add = function add() {
      context.rule.addUntil && startAddUntil(context);
      (0, _ruleDB.addRule)(context);
    };
    switch (result.logic) {
      case 'ADD_RULE':
        return _globalEvents2.default.once('END_ACTION_EXECUTION', add);
      case 'ADD_RULE_BEFORE':
        return add();
      case 'REAPPLY_ADD_WHEN':
        return _globalEvents2.default.once('END_ACTION_EXECUTION', function () {
          return startAddWhen(context);
        });
      case 'CANCELED':
      case 'ABORT':
        return;
      default:
        {
          if (process.env.NODE_ENV !== 'production') {
            throw new Error('invalid return type "' + String(result.logic) + '" for addWhen saga (' + context.rule.id + ')');
          }
        }
    }
  });
};

var startAddUntil = function startAddUntil(context) {
  return (0, _saga.startSaga)('addUntil', context, function (result) {
    switch (result.logic) {
      case 'REMOVE_RULE':
        return _globalEvents2.default.once('END_ACTION_EXECUTION', function () {
          return (0, _ruleDB.removeRule)(context);
        });
      case 'REMOVE_RULE_BEFORE':
        return (0, _ruleDB.removeRule)(context);
      case 'RECREATE_RULE':
        return _globalEvents2.default.once('END_ACTION_EXECUTION', function () {
          (0, _ruleDB.removeRule)(context);
          if (context.rule.addWhen) startAddWhen(context);else startAddUntil(context);
        });
      case 'RECREATE_RULE_BEFORE':
        {
          (0, _ruleDB.removeRule)(context);
          if (context.rule.addWhen) startAddWhen(context);else startAddUntil(context);
          return;
        }
      case 'REAPPLY_ADD_UNTIL':
        return _globalEvents2.default.once('END_ACTION_EXECUTION', function () {
          return startAddUntil(context);
        });
      case 'READD_RULE':
        return _globalEvents2.default.once('END_ACTION_EXECUTION', function () {
          (0, _ruleDB.removeRule)(context);
          startAddUntil(context);
        });
      case 'READD_RULE_BEFORE':
        {
          (0, _ruleDB.removeRule)(context);
          startAddUntil(context);
          return;
        }
      case 'ABORT':
      case 'CANCELED':
        return;
      default:
        {
          if (process.env.NODE_ENV !== 'production') {
            throw new Error('invalid return type "' + String(result.logic) + '" for addUntil saga (' + context.rule.id + ')');
          }
        }
    }
  });
};

function activateSubRule(parentContext, name, parameters) {
  if ((typeof name === 'undefined' ? 'undefined' : (0, _typeof3.default)(name)) === 'object') {
    throw new Error('sub-rules must be a string. please see docs: https://redux-ruleset.netlify.com/docs/advancedConcepts/sub_rules.html');
  }

  if (!parentContext.rule.subRules || !parentContext.rule.subRules[name]) {
    throw new Error('you tried to add sub-rule "' + name + '" but rule "' + parentContext.rule.id + '" does not have such an sub-rule');
  }

  var id = parentContext.rule.id + ':' + name + '-' + parentContext.subRuleContextCounter++;

  var rule = (0, _assign2.default)({}, parentContext.rule.subRules[name], { id: id });
  registerRule(rule, parentContext, parameters);
}

function registerRule(rule, parentContext, parameters) {

  // check if rule is already registered
  if (registeredDict[rule.id]) {
    dropRule(rule);
    if (process.env.NODE_ENV !== 'production') {
      console.warn('you added the same rule "' + rule.id + '" twice. Either this comes from HMR (which can be ignored) or you defined two rules with the same id (which is an error)');
    }
  }

  var ruleContext = (0, _utils.createRuleContext)(rule);

  registeredDict[rule.id] = ruleContext;

  // clear public context
  ruleContext.events.on('SAGA_END', function (_, result) {
    switch (result) {
      case 'RECREATE_RULE':
      case 'REAPPLY_ADD_WHEN':
      case 'RECREATE_RULE_BEFORE':
        ruleContext.publicContext.addWhen = {};
      case 'READD_RULE':
      case 'READD_RULE_BEFORE':
      case 'REAPPLY_ADD_UNTIL':
        ruleContext.publicContext.addUntil = {};
    }
  });
  _globalEvents2.default.trigger('REGISTER_RULE', ruleContext);

  //remove addOnce rules
  if (rule.addOnce) {
    ruleContext.events.on('CONSEQUENCE_END', function (_, status) {
      status === 'RESOLVED' && (0, _ruleDB.removeRule)(ruleContext);
    });
  }

  if (parentContext) {
    ruleContext.publicContext.global = parameters || {};
    ruleContext.parentContext = parentContext;
    parentContext.subRuleContexts.push(ruleContext);
  }

  // activate
  if (rule.addWhen) startAddWhen(ruleContext);else {
    (0, _ruleDB.addRule)(ruleContext);
    if (rule.addUntil) startAddUntil(ruleContext);
  }

  return rule;
}

function dropRule(rule) {
  var ruleContext = registeredDict[rule.id];
  if (!ruleContext) return;
  (0, _ruleDB.removeRule)(ruleContext);
  registeredDict[rule.id] = null;
}

var testing = exports.testing = { startAddWhen: startAddWhen, startAddUntil: startAddUntil, registeredDict: registeredDict };