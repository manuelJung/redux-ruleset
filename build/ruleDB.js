'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPrivatesForTesting = undefined;
exports.addRule = addRule;
exports.removeRule = removeRule;
exports.forEachRuleContext = forEachRuleContext;
exports.getRuleContext = getRuleContext;
exports.registerContextListener = registerContextListener;

var _saga = require('./saga');

var saga = _interopRequireWildcard(_saga);

var _laterEvents = require('./utils/laterEvents');

var _devTools = require('./utils/devTools');

var devTools = _interopRequireWildcard(_devTools);

var _removeItem = require('./utils/removeItem');

var _removeItem2 = _interopRequireDefault(_removeItem);

var _validate = require('./utils/validate');

var _validate2 = _interopRequireDefault(_validate);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var activeRules = {
  'BEFORE': {},
  'INSTEAD': {},
  'AFTER': {}
};


var ruleContextList = {};

var contextListeners = [];

var getPrivatesForTesting = exports.getPrivatesForTesting = function getPrivatesForTesting(key) {
  return { activeRules: activeRules, ruleContextList: ruleContextList, contextListeners: contextListeners }[key];
};

function addRule(rule) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var parentRuleId = options.parentRuleId,
      forceAdd = options.forceAdd,
      addWhenContext = options.addWhenContext,
      addUntilContext = options.addUntilContext;

  var parentContext = parentRuleId && ruleContextList[parentRuleId];

  // if sub-rule has add-until that is invoked when parent add-until is invoked
  // and return RECREATE_RULE or READD_RULE the rule should not be added
  if (parentContext && !parentContext.active) {
    return rule;
  }
  if (process.env.NODE_ENV === 'development') {
    (0, _validate2.default)(rule, ruleContextList);
    devTools.registerRule(rule, parentRuleId || null);
  }

  var context = createContext(rule, { addWhenContext: addWhenContext, addUntilContext: addUntilContext });
  var position = rule.position || 'AFTER';

  if (contextListeners.length && !getRuleContext(rule)) {
    for (var i = 0; i < contextListeners.length; i++) {
      contextListeners[i](context);
    }
  }

  if (parentContext) {
    parentContext.childRules.push(rule);
  }

  var add = function add(action) {
    context.active = true;
    ruleContextList[rule.id] = context;
    forEachTarget(rule.target, function (target) {
      if (!activeRules[position][target]) activeRules[position][target] = [];
      var list = activeRules[position][target];
      if (list.length > 0) pushByWeight(list, rule);else list.push(rule);
    });
    addUntil(action);
    context.trigger('ADD_RULE');
    if (process.env.NODE_ENV === 'development') {
      devTools.addRule(rule.id, options.parentRuleId || null);
    }
  };
  var addWhen = function addWhen() {
    return rule.addWhen && saga.createSaga(context, rule.addWhen, function (_ref) {
      var logic = _ref.logic,
          action = _ref.action,
          actionExecId = _ref.actionExecId;

      switch (logic) {
        case 'ADD_RULE':
          (0, _laterEvents.addCallback)(actionExecId, function () {
            return add(action);
          });break;
        case 'ADD_RULE_BEFORE':
          add(action);break;
        case 'REAPPLY_ADD_WHEN':
          (0, _laterEvents.addCallback)(actionExecId, function () {
            context.addWhenContext = {};addWhen();
          });break;
        case 'CANCELED':
        case 'ABORT':
          break;
        default:
          {
            if (process.env.NODE_ENV === 'development') {
              throw new Error('invalid return type "' + String(logic) + '" for addWhen saga (' + rule.id + ')');
            }
          }
      }
    });
  };
  var addUntil = function addUntil(action) {
    return rule.addUntil && saga.createSaga(context, rule.addUntil, function (_ref2) {
      var logic = _ref2.logic,
          action = _ref2.action,
          actionExecId = _ref2.actionExecId;

      switch (logic) {
        case 'RECREATE_RULE':
          (0, _laterEvents.addCallback)(actionExecId, function () {
            removeRule(rule);addRule(rule, { parentRuleId: parentRuleId });
          });break;
        case 'RECREATE_RULE_BEFORE':
          removeRule(rule);addRule(rule, { parentRuleId: parentRuleId });break;
        case 'REMOVE_RULE':
          (0, _laterEvents.addCallback)(actionExecId, function () {
            removeRule(rule);
          });break;
        case 'REMOVE_RULE_BEFORE':
          removeRule(rule);break;
        case 'REAPPLY_ADD_UNTIL':
          (0, _laterEvents.addCallback)(actionExecId, function () {
            return addUntil(action);
          });break;
        case 'READD_RULE':
          (0, _laterEvents.addCallback)(actionExecId, function () {
            removeRule(rule);addRule(rule, { parentRuleId: parentRuleId, forceAdd: true, addWhenContext: context.addWhenContext });
          });break;
        case 'READD_RULE_BEFORE':
          removeRule(rule);addRule(rule, { parentRuleId: parentRuleId, forceAdd: true, addWhenContext: context.addWhenContext });break;
        case 'CANCELED':
        case 'ABORT':
          break;
        default:
          {
            if (process.env.NODE_ENV === 'development') {
              throw new Error('invalid return type "' + String(logic) + '" for addUntil saga (' + rule.id + ')');
            }
          }
      }
    });
  };

  if (rule.addWhen && !forceAdd) addWhen();else add();
  return rule;
}

function removeRule(rule, removedByParent) {
  var context = ruleContextList[rule.id];
  if (!context.active) return;
  var position = rule.position || 'AFTER';

  // remove child rules before parent rule (logical order)
  if (context.childRules.length) {
    for (var i = 0; i < context.childRules.length; i++) {
      removeRule(context.childRules[i], true);
    }
  }
  context.active = false;
  rule.target && forEachTarget(rule.target, function (target) {
    (0, _removeItem2.default)(activeRules[position][target], rule);
  });
  context.trigger('REMOVE_RULE');
  if (process.env.NODE_ENV === 'development') {
    devTools.removeRule(rule.id, removedByParent || false);
  }
}

function forEachRuleContext(position, actionType, cb) {
  var globalRules = activeRules[position].global;
  var boundRules = activeRules[position][actionType];
  if (globalRules) {
    for (var i = 0; i < globalRules.length; i++) {
      cb(ruleContextList[globalRules[i].id]);
    }
  }
  if (boundRules) {
    for (var _i = 0; _i < boundRules.length; _i++) {
      cb(ruleContextList[boundRules[_i].id]);
    }
  }
}

function getRuleContext(rule) {
  return ruleContextList[rule.id];
}

function registerContextListener(cb) {
  contextListeners.push(cb);
}

// HELPERS

function createContext(rule, options) {
  var listeners = {};
  return {
    rule: rule,
    childRules: [],
    active: false,
    pendingSaga: false,
    sagaStep: 0,
    addWhenContext: options.addWhenContext || {},
    addUntilContext: options.addUntilContext || {},
    concurrency: {
      default: {
        running: 0,
        debounceTimeoutId: null
      }
    },
    on: function on(e, cb) {
      if (!listeners[e]) listeners[e] = [];
      listeners[e].push(cb);
    },
    off: function off(e, cb) {
      return (0, _removeItem2.default)(listeners[e], cb);
    },
    trigger: function trigger(e, payload) {
      if (!listeners[e]) return;
      for (var i = 0; i < listeners[e].length; i++) {
        var cb = listeners[e][i];
        cb(payload);
      }
    }
  };
}

function forEachTarget(target, cb) {
  if (typeof target === 'string') {
    if (target === '*') cb('global');else cb(target);
  } else {
    for (var i = 0; i < target.length; i++) {
      cb(target[i]);
    }
  }
}

function pushByWeight(list, rule) {
  if (!rule.weight) {
    list.unshift(rule);
    return;
  }
  var index = list.reduce(function (p, n, i) {
    if (typeof n.weight !== 'number' || typeof rule.weight !== 'number') {
      return p;
    }
    if (rule.weight > n.weight) return i + 1;else return p;
  }, 0);
  list.splice(index, 0, rule);
}