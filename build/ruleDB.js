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

var _consequence = require('./consequence');

var _consequence2 = _interopRequireDefault(_consequence);

var _lazyStore = require('./lazyStore');

var _laterEvents = require('./laterEvents');

var _devTools = require('./devTools');

var devTools = _interopRequireWildcard(_devTools);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var activeRules = {
  'INSERT_BEFORE': {},
  'INSERT_INSTEAD': {},
  'INSERT_AFTER': {}
};


var i = void 0;

var ruleContextList = {};

var contextListeners = [];

var getPrivatesForTesting = exports.getPrivatesForTesting = function getPrivatesForTesting(key) {
  return { activeRules: activeRules, ruleContextList: ruleContextList, contextListeners: contextListeners }[key];
};

function addRule(rule) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var parentRuleId = options.parentRuleId,
      forceAdd = options.forceAdd;

  var context = createContext(rule);
  var position = rule.position || 'INSERT_AFTER';
  if (contextListeners.length && !getRuleContext(rule)) {
    for (var _i = 0; _i < contextListeners.length; _i++) {
      contextListeners[_i](context);
    }
  }

  if (parentRuleId) {
    var parentContext = ruleContextList[parentRuleId];
    parentContext.childRules.push(rule);
  }

  var add = function add() {
    context.active = true;
    ruleContextList[rule.id] = context;
    !rule.target && (0, _lazyStore.applyLazyStore)(function (store) {
      (0, _consequence2.default)(context, undefined, store, null);
    });
    rule.target && forEachTarget(rule.target, function (target) {
      if (!activeRules[position][target]) activeRules[position][target] = [];
      var list = activeRules[position][target];
      if (list.length > 0) pushByZIndex(list, rule);else list.push(rule);
    });
    addUntil();
    context.trigger('ADD_RULE');
    if (process.env.NODE_ENV === 'development') {
      devTools.addRule(rule, options.parentRuleId || null);
    }
  };
  var addWhen = function addWhen() {
    return rule.addWhen && saga.createSaga(context, rule.addWhen, function (logic) {
      switch (logic) {
        case 'ADD_RULE':
          (0, _laterEvents.addCallback)(add);break;
        case 'ADD_RULE_BEFORE':
          add();break;
        case 'REAPPLY_WHEN':
          (0, _laterEvents.addCallback)(addWhen);break;
      }
    });
  };
  var addUntil = function addUntil() {
    return rule.addUntil && saga.createSaga(context, rule.addUntil, function (logic) {
      switch (logic) {
        case 'RECREATE_RULE':
          (0, _laterEvents.addCallback)(function () {
            removeRule(rule);addRule(rule, { parentRuleId: parentRuleId });
          });break;
        case 'RECREATE_RULE_BEFORE':
          removeRule(rule);addRule(rule, { parentRuleId: parentRuleId });break;
        case 'REMOVE_RULE':
          (0, _laterEvents.addCallback)(function () {
            removeRule(rule);
          });break;
        case 'REMOVE_RULE_BEFORE':
          removeRule(rule);break;
        case 'REAPPLY_REMOVE':
          (0, _laterEvents.addCallback)(addUntil);break;
        case 'READD_RULE':
          (0, _laterEvents.addCallback)(function () {
            removeRule(rule);addRule(rule, { parentRuleId: parentRuleId, forceAdd: true });
          });break;
      }
    });
  };

  if (rule.addWhen && !forceAdd) addWhen();else add();
  return rule;
}

function removeRule(rule, removedByParent) {
  var context = ruleContextList[rule.id];
  var position = rule.position || 'INSERT_AFTER';

  // remove child rules before parent rule (logical order)
  if (context.childRules.length) {
    for (var _i2 = 0; _i2 < context.childRules.length; _i2++) {
      removeRule(context.childRules[_i2], true);
    }
  }
  context.active = false;
  rule.target && forEachTarget(rule.target, function (target) {
    var list = activeRules[position][target];
    activeRules[position][target] = list.filter(function (r) {
      return r.id !== rule.id;
    });
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
    for (var _i3 = 0; _i3 < globalRules.length; _i3++) {
      cb(ruleContextList[globalRules[_i3].id]);
    }
  }
  if (boundRules) {
    for (var _i4 = 0; _i4 < boundRules.length; _i4++) {
      cb(ruleContextList[boundRules[_i4].id]);
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

function createContext(rule) {
  var listeners = {};
  return {
    rule: rule,
    childRules: [],
    active: false,
    pendingSaga: false,
    sagaStep: 0,
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
      listeners[e] = listeners[e].filter(function (l) {
        return l !== cb;
      });
    },
    trigger: function trigger(e, payload) {
      if (!listeners[e]) return;
      for (var _i5 = 0; _i5 < listeners[e].length; _i5++) {
        var cb = listeners[e][_i5];
        cb(payload);
      }
    }
  };
}

function forEachTarget(target, cb) {
  if (typeof target === 'string') {
    if (target === '*') cb('global');else cb(target);
  } else {
    for (var _i6 = 0; _i6 < target.length; _i6++) {
      cb(target[_i6]);
    }
  }
}

function pushByZIndex(list, rule) {
  var index = list.reduce(function (p, n, i) {
    if (typeof n.zIndex !== 'number' || typeof rule.zIndex !== 'number') {
      return p;
    }
    if (rule.zIndex > n.zIndex) return i + 1;else return p;
  }, 0);
  list.splice(index, 0, rule);
}