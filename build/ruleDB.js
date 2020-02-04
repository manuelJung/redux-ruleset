'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.testing = exports.forEachRuleContext = exports.removeRule = exports.addRule = undefined;

var _types = require('./types');

var t = _interopRequireWildcard(_types);

var _utils = require('./utils');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var activeRules = {
  INSTEAD: {},
  BEFORE: {},
  AFTER: {}
};

var GLOBAL_TYPE = '-global-';

var addRule = exports.addRule = function addRule(context) {
  var position = context.rule.position || 'AFTER';

  // throw error if rule is already active
  if (context.active) {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error('you tried to add an already added rule "' + context.rule.id + '"');
    }
    return;
  }

  // calculate targets
  var targets = void 0;
  if (context.rule.target === '*') targets = [GLOBAL_TYPE];else if (typeof context.rule.target === 'string') targets = [context.rule.target];else targets = context.rule.target;

  // add context to activeRules by targets
  for (var i = 0; i < targets.length; i++) {
    if (!activeRules[position][targets[i]]) activeRules[position][targets[i]] = [];
    pushByWeight(activeRules[position][targets[i]], context);
  }

  // activate rule
  context.active = true;
  context.events.trigger('ADD_RULE');
};

var removeRule = exports.removeRule = function removeRule(context) {
  if (context.active === false) return;
  // remove child rules
  for (var name in context.subRuleContexts) {
    var subContext = context.subRuleContexts[name];
    if (subContext.active) removeRule(subContext);
  }

  context.active = false;
  var position = context.rule.position || 'AFTER';

  // calculate targets
  var targets = void 0;
  if (context.rule.target === '*') targets = [GLOBAL_TYPE];else if (typeof context.rule.target === 'string') targets = [context.rule.target];else targets = context.rule.target;

  // remove context from activeRules by targets
  for (var i = 0; i < targets.length; i++) {
    if (!activeRules[position][targets[i]]) activeRules[position][targets[i]] = [];
    (0, _utils.removeItem)(activeRules[position][targets[i]], context);
  }

  context.events.trigger('REMOVE_RULE');
};

var forEachRuleContext = exports.forEachRuleContext = function forEachRuleContext(target, position, cb) {
  var globalList = activeRules[position][GLOBAL_TYPE] || [];
  var targetList = activeRules[position][target] || [];
  var i = 0;

  for (i = 0; i < globalList.length; i++) {
    cb(globalList[i]);
  }for (i = 0; i < targetList.length; i++) {
    cb(targetList[i]);
  }
};

function pushByWeight(list, ruleContext) {
  if (!ruleContext.rule.weight || !list.length) {
    return list.unshift(ruleContext);
  }
  var i = void 0,
      prev = void 0,
      temp = void 0;

  for (i = 0; i < list.length; i++) {
    if (prev) {
      temp = list[i];
      list[i] = prev;
      prev = temp;
    } else if (!list[i].rule.weight) {
      continue;
    } else if (ruleContext.rule.weight <= list[i].rule.weight) {
      prev = list[i];
      list[i] = ruleContext;
    }
  }

  if (prev) list.push(prev);else list.push(ruleContext);
}

var testing = exports.testing = { activeRules: activeRules };