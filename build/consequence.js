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

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var executionId = 1;

var i = void 0;

var nextExecutionId = null;
function getRuleExecutionId() {
  var id = nextExecutionId;
  return id;
}

var orderedListeners = {};

function consequence(context, action, store, actionExecId) {
  var execId = executionId++;
  var rule = context.rule;
  context.trigger('CONSEQUENCE_START', execId);

  /**
   * Check concurrency and conditions
   */

  // trigger when consequence should not be invoked (e.g condition does not match)
  var skipConsequence = function skipConsequence() {
    context.trigger('CONSEQUENCE_END', execId);
    return false;
  };

  // skip when concurrency matches
  if (context.running) {
    if (rule.concurrency === 'ONCE') return skipConsequence();
    if (rule.concurrency === 'FIRST') return skipConsequence();
    if (rule.addOnce) return skipConsequence();
    if (rule.concurrency === 'LAST') context.trigger('CANCEL_CONSEQUENCE');
    if (rule.debounce) context.trigger('CANCEL_CONSEQUENCE');
  }
  // skip if 'skipRule' condition matched
  if (action && action.meta && action.meta.skipRule && matchGlob(rule.id, action.meta.skipRule)) {
    return skipConsequence();
  }
  // skip if rule condition does not match
  if (rule.condition && !rule.condition(action, store.getState)) {
    return skipConsequence();
  }

  /**
   * Prepare Execution
   */

  var canceled = false;
  var execution = null;
  var cancel = function cancel() {
    canceled = true;
  };
  var effect = function effect(fn) {
    if (canceled) return;
    if (rule.concurrency === 'ORDERED' && execution && execution.active !== execId) {
      execution.effects[execId].push(function () {
        return effect(fn);
      });
      return;
    }
    rule.concurrency === 'SWITCH' && context.trigger('CANCEL_CONSEQUENCE');
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
  var addRule = function addRule(rule, parentRuleId) {
    effect(function () {
      context.childRules.push(rule);
      return parentRuleId ? ruleDB.addRule(rule) : ruleDB.addRule(rule, { parentRuleId: context.rule.id });
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
    execution = registerExecution(context, execId);
  }

  context.on('CANCEL_CONSEQUENCE', cancel);
  context.on('REMOVE_RULE', cancel);

  /**
   * Execute consequence
   */

  context.running++;
  var result = void 0;

  if (rule.debounce || rule.throttle) {
    result = new _promise2.default(function (resolve) {
      return setTimeout(function () {
        if (canceled) return resolve();
        var result = rule.consequence({ dispatch: dispatch, getState: getState, action: action, addRule: addRule, removeRule: removeRule, effect: effect });
        resolve(result);
      }, rule.throttle || rule.debounce);
    });
  } else {
    result = rule.consequence({ dispatch: dispatch, getState: getState, action: action, addRule: addRule, removeRule: removeRule, effect: effect });
  }

  /**
   * Handle return types
   */

  // dispatch returned action
  if ((typeof result === 'undefined' ? 'undefined' : (0, _typeof3.default)(result)) === 'object' && result.type) {
    var _action = result;
    dispatch(_action);
    unlisten(context, execId, cancel);
  }

  // dispatch returned (promise-wrapped) action
  else if ((typeof result === 'undefined' ? 'undefined' : (0, _typeof3.default)(result)) === 'object' && result.then) {
      var promise = result;
      promise.then(function (action) {
        action && action.type && dispatch(action);
        if (rule.concurrency === 'ORDERED') effect(function () {
          return unlisten(context, execId, cancel);
        });else unlisten(context, execId, cancel);
      });
    }

    // register unlisten callback
    else if (typeof result === 'function') {
        var cb = result;
        var applyCb = function applyCb() {
          unlisten(context, execId, cancel);
          context.off('REMOVE_RULE', applyCb);
          context.off('CANCEL_CONSEQUENCE', applyCb);
          cb();
        };
        context.on('REMOVE_RULE', applyCb);
        context.on('CANCEL_CONSEQUENCE', applyCb);
      }

      // unlisten for void return
      else {
          unlisten(context, execId, cancel);
        }

  return true;
}

// HELPERS

function unlisten(context, execId, cancelFn) {
  context.rule.concurrency !== 'ONCE' && context.running--;
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
function registerExecution(context, execId) {
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
  context.on('CANCEL_CONSEQUENCE', clearStore); // important when debouncing
  return store;
}