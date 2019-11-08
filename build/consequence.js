'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.getRuleExecutionId = getRuleExecutionId;
exports.default = consequence;

var _ruleDB = require('./ruleDB');

var ruleDB = _interopRequireWildcard(_ruleDB);

var _devTools = require('./utils/devTools');

var devTools = _interopRequireWildcard(_devTools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var executionId = 1;

var nextExecutionId = null;
function getRuleExecutionId() {
  var id = nextExecutionId;
  nextExecutionId = null;
  return id;
}

function consequence(context, action, store, actionExecId) {
  var execId = executionId++;
  var rule = context.rule;
  var ctx = {
    getContext: function getContext(key) {
      return context.addUntilContext[key] || context.addWhenContext[key];
    },
    setContext: function setContext(key, value) {
      throw new Error('consequences cannot set context');
    }
  };

  context.trigger('CONSEQUENCE_START', execId);

  var concurrencyId = rule.concurrencyFilter && action ? rule.concurrencyFilter(action) : 'default';
  if (!context.concurrency[concurrencyId]) {
    context.concurrency[concurrencyId] = {
      running: 0,
      debounceTimeoutId: null
    };
  }
  var concurrency = context.concurrency[concurrencyId];

  if (process.env.NODE_ENV === 'development') {
    devTools.execRuleStart(rule.id, execId, actionExecId, concurrencyId);
  }

  /**
   * Check concurrency and conditions
   */

  // trigger when consequence should not be invoked (e.g condition does not match)
  var skipConsequence = function skipConsequence() {
    context.trigger('CONSEQUENCE_END', execId);
    if (process.env.NODE_ENV === 'development') {
      devTools.execRuleEnd(rule.id, execId, actionExecId, concurrencyId, 'SKIP');
    }
    return { resolved: false };
  };

  // skip when concurrency matches
  if (concurrency.running) {
    if (rule.concurrency === 'ONCE') return skipConsequence();
    if (rule.concurrency === 'FIRST') return skipConsequence();
    if (rule.addOnce) return skipConsequence();
    if (rule.concurrency === 'LAST') context.trigger('CANCEL_CONSEQUENCE', concurrencyId);
    if (rule.throttle) context.trigger('CANCEL_CONSEQUENCE', concurrencyId);
    if (rule.debounce) context.trigger('CANCEL_CONSEQUENCE', concurrencyId);
  }
  // skip if 'skipRule' condition matched
  if (action && action.meta && action.meta.skipRule && matchGlob(rule.id, action.meta.skipRule)) {
    return skipConsequence();
  }
  // skip if rule condition does not match
  if (rule.condition && !rule.condition(action, store.getState, ctx)) {
    if (process.env.NODE_ENV === 'development') {
      devTools.execRuleEnd(rule.id, execId, actionExecId, concurrencyId, 'CONDITION_NOT_MATCH');
    }
    context.trigger('CONSEQUENCE_END', execId);
    return { resolved: false };
  }

  /**
   * Prepare Execution
   */

  var canceled = false;
  var execution = null;
  var cancel = function cancel() {
    canceled = true;
  };
  var wasCanceled = function wasCanceled() {
    return canceled;
  };
  var effect = function effect(fn) {
    if (canceled) return;
    if (rule.concurrency === 'ORDERED' && execution && execution.active !== execId) {
      execution.effects[execId].push(function () {
        return effect(fn);
      });
      return;
    }
    rule.concurrency === 'SWITCH' && context.trigger('CANCEL_CONSEQUENCE', concurrencyId);
    fn();
  };
  var getState = store.getState;
  var dispatch = function dispatch(action) {
    effect(function () {
      nextExecutionId = execId;
      var result = store.dispatch(action);
      nextExecutionId = null;
      return result;
    });return action;
  };
  var addRule = function addRule(rule) {
    effect(function () {
      ruleDB.addRule(rule, { parentRuleId: context.rule.id });
    });return rule;
  };
  var removeRule = function removeRule(rule) {
    effect(function () {
      return ruleDB.removeRule(rule);
    });
  };

  /**
   * Setup Cancel Listeners
   */
  if (rule.concurrency === 'ORDERED') {
    execution = registerOrdererdExecution(context, execId, concurrencyId);
  }

  context.on('CANCEL_CONSEQUENCE', function (id) {
    id === concurrencyId && cancel();
  });
  context.on('REMOVE_RULE', cancel);

  /**
   * Execute consequence
   */

  concurrency.running++;
  var result = void 0;
  var args = { dispatch: dispatch, getState: getState, action: action, addRule: addRule, removeRule: removeRule, effect: effect, wasCanceled: wasCanceled, context: ctx };

  if (rule.throttle || rule.delay || rule.debounce) {
    result = new _promise2.default(function (resolve) {
      if (rule.debounce && concurrency.debounceTimeoutId) clearTimeout(concurrency.debounceTimeoutId);
      concurrency.debounceTimeoutId = setTimeout(function () {
        concurrency.debounceTimeoutId = null;
        if (canceled) return resolve();
        var result = rule.consequence(args);
        resolve(result);
      }, rule.throttle || rule.delay || rule.debounce);
    });
  } else {
    result = rule.consequence(args);
  }

  /**
   * Handle return types
   */

  // position:INSTEAD can extend the action if type is equal
  if (action && (typeof result === 'undefined' ? 'undefined' : (0, _typeof3.default)(result)) === 'object' && result.type && rule.position === 'INSTEAD' && result.type === action.type) {
    var _action = result;
    unlisten(context, execId, cancel, concurrency);
    return { resolved: true, action: _action };
  }

  // dispatch returned action
  if ((typeof result === 'undefined' ? 'undefined' : (0, _typeof3.default)(result)) === 'object' && result.type) {
    var _action2 = result;
    dispatch(_action2);
    unlisten(context, execId, cancel, concurrency);
    if (process.env.NODE_ENV === 'development') {
      devTools.execRuleEnd(rule.id, execId, actionExecId, concurrencyId, 'RESOLVED');
    }
  }

  // dispatch returned (promise-wrapped) action
  else if ((typeof result === 'undefined' ? 'undefined' : (0, _typeof3.default)(result)) === 'object' && result.then) {
      var promise = result;
      promise.then(function (action) {
        action && action.type && dispatch(action);
        if (rule.concurrency === 'ORDERED') effect(function () {
          return unlisten(context, execId, cancel, concurrency);
        });else unlisten(context, execId, cancel, concurrency);
        if (process.env.NODE_ENV === 'development') {
          devTools.execRuleEnd(rule.id, execId, actionExecId, concurrencyId, 'RESOLVED');
        }
      });
    }

    // register unlisten callback
    else if (typeof result === 'function') {
        var cb = result;
        var applyCb = function applyCb() {
          unlisten(context, execId, cancel, concurrency);
          context.off('REMOVE_RULE', applyCb);
          context.off('CANCEL_CONSEQUENCE', applyCb);
          if (process.env.NODE_ENV === 'development') {
            devTools.execRuleEnd(rule.id, execId, actionExecId, concurrencyId, 'RESOLVED');
          }
          cb();
        };
        context.on('REMOVE_RULE', applyCb);
        context.on('CANCEL_CONSEQUENCE', function (id) {
          id === concurrencyId && applyCb();
        });
      }

      // unlisten for void return
      else {
          unlisten(context, execId, cancel, concurrency);
          if (process.env.NODE_ENV === 'development') {
            devTools.execRuleEnd(rule.id, execId, actionExecId, concurrencyId, 'RESOLVED');
          }
        }

  return { resolved: true };
}

// HELPERS

function unlisten(context, execId, cancelFn, concurrency) {
  context.rule.concurrency !== 'ONCE' && concurrency.running--;
  context.trigger('CONSEQUENCE_END', execId);
  context.rule.addOnce && ruleDB.removeRule(context.rule);
  context.off('CANCEL_CONSEQUENCE', cancelFn);
  context.off('REMOVE_RULE', cancelFn);
}

function matchGlob(id, glob) {
  if (glob === '*') return true;
  if (typeof glob === 'string') return glob === id;else return glob.includes(id);
}

var db = {};
function registerOrdererdExecution(context, execId, concurrencyId) {
  var id = context.rule.id;

  if (db[id]) {
    db[id].buffer.push(execId);
    db[id].effects[execId] = [];
    return db[id];
  }
  db[id] = {
    active: execId,
    buffer: [],
    effects: (0, _defineProperty3.default)({}, execId, [])
  };
  var store = db[id];

  var clearStore = function clearStore() {
    context.off('CONSEQUENCE_END', updateActive);
    context.off('CANCEL_CONSEQUENCE', clearStore);
    delete db[context.rule.id];
  };

  var updateActive = function updateActive() {
    var nextId = store.buffer.splice(0, 1)[0];
    if (!nextId) return clearStore();
    store.active = nextId;
    var effects = store.effects[nextId];
    effects.forEach(function (fn) {
      return fn();
    });
  };

  context.on('CONSEQUENCE_END', updateActive);
  context.on('REMOVE_RULE', clearStore);
  context.on('CANCEL_CONSEQUENCE', function (id) {
    id === concurrencyId && clearStore();
  }); // important when debouncing
  return store;
}