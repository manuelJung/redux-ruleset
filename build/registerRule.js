'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.testing = undefined;
exports.activateSubRule = activateSubRule;
exports.default = registerRule;

var _types = require('./types');

var t = _interopRequireWildcard(_types);

var _utils = require('./utils');

var _saga = require('./saga');

var _ruleDB = require('./ruleDB');

var _globalEvents = require('./globalEvents');

var _globalEvents2 = _interopRequireDefault(_globalEvents);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

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

function activateSubRule(ruleContext, name) {
  var parameters = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var subContext = ruleContext.subRuleContexts[name];

  if (!subContext) {
    throw new Error('you tried to add sub-rule "' + name + '" but rule "' + ruleContext.rule.id + '" does not have such an sub-rule');
  }

  subContext.publicContext.global = parameters;

  if (subContext.rule.addWhen) startAddWhen(subContext);else {
    (0, _ruleDB.addRule)(subContext);
    if (subContext.rule.addUntil) startAddUntil(subContext);
  }
}

function registerRule(rule, parentContext, name) {

  // check if rule is already registered
  if (registeredDict[rule.id]) {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error('the rule-id "' + rule.id + '" is already registered. Either you want to register the same rule twice or you have two rules with the same id');
    }
    return;
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

  // register sub rules
  if (rule.subRules) {
    for (var _name in rule.subRules) {
      var subRule = rule.subRules[_name];
      subRule.id = rule.id + '::' + _name;
      registerRule(subRule, ruleContext, _name);
    }
  }

  // subrules are not active initially
  if (parentContext && name) {
    ruleContext.parentContext = parentContext;
    parentContext.subRuleContexts[name] = ruleContext;
    return rule;
  }

  // activate
  if (rule.addWhen) startAddWhen(ruleContext);else {
    debugger;
    (0, _ruleDB.addRule)(ruleContext);
    if (rule.addUntil) startAddUntil(ruleContext);
  }

  return rule;
}

var testing = exports.testing = { startAddWhen: startAddWhen, startAddUntil: startAddUntil, registeredDict: registeredDict };