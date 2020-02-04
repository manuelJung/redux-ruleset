'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getCurrentRuleExecId = undefined;

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

exports.default = consequence;

var _types = require('./types');

var t = _interopRequireWildcard(_types);

var _setup = require('./setup');

var setup = _interopRequireWildcard(_setup);

var _registerRule = require('./registerRule');

var _ruleDB = require('./ruleDB');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var execId = 1;
var wrappedExecIds = [];
var getCurrentRuleExecId = exports.getCurrentRuleExecId = function getCurrentRuleExecId() {
  return wrappedExecIds[wrappedExecIds.length - 1] || null;
};

function consequence(actionExecution, ruleContext) {
  var action = actionExecution.action;
  var rule = ruleContext.rule;

  // setup concurrency
  var concurrencyId = rule.concurrencyFilter ? rule.concurrencyFilter(action) : 'default';
  if (!ruleContext.concurrency[concurrencyId]) {
    ruleContext.concurrency[concurrencyId] = {
      running: 0,
      debounceTimeoutId: null
      // orderedEffects: []
    };
  }
  var concurrency = ruleContext.concurrency[concurrencyId];

  // addOnce rules may not be removed when they return a promise
  // so we totally ignore all futher consequence executions until the rule is removed
  if (concurrency.running) {
    // TODO: what happens when position === INSTEAD. will actionExecution be canceled=
    if (rule.addOnce) return { resolved: false };
  }

  // setup ruleExecution
  var ruleExecution = {
    execId: execId++,
    concurrencyId: concurrencyId,
    actionExecId: actionExecution.execId
  };

  ruleContext.events.trigger('CONSEQUENCE_START', ruleExecution);
  concurrency.running++;

  /**
   * Check concurrency and conditions
   */

  // trigger when consequence should not be invoked (e.g condition does not match)
  var endConsequence = function endConsequence(logic) {
    concurrency.running--;
    ruleContext.events.trigger('CONSEQUENCE_END', ruleExecution, logic);
    return { resolved: false };
  };

  if (concurrency.running - 1 > 0) {
    // skip when concurrency matches
    if (rule.concurrency === 'ONCE') return endConsequence('SKIP');
    if (rule.concurrency === 'FIRST') return endConsequence('SKIP');
    // cancel previous consequences
    if (rule.concurrency === 'LAST') ruleContext.events.trigger('CANCEL_CONSEQUENCE', ruleExecution, 'LAST');
    if (rule.throttle) ruleContext.events.trigger('CANCEL_CONSEQUENCE', ruleExecution, 'THROTTLE');
    if (rule.debounce) ruleContext.events.trigger('CANCEL_CONSEQUENCE', ruleExecution, 'DEBOUNCE');
  }
  // skip if 'skipRule' condition matched
  if (action.meta && action.meta.skipRule && matchGlob(rule.id, action.meta.skipRule)) {
    return endConsequence('SKIP');
  }
  // skip if rule condition does not match
  if (rule.condition) {
    var conditionArgs = setup.createConditionArgs({ context: (0, _assign2.default)({}, ruleContext.publicContext, {
        setContext: function setContext(key, value) {
          throw new Error('you cannot call setContext within condition. check rule ' + rule.id);
        }
      }) });
    if (rule.condition && !rule.condition(action, conditionArgs)) {
      return endConsequence('CONDITION_NOT_MATCHED');
    }
  }

  /**
   * setup cancelation
   */

  // later consequences can cancel this execution
  var offCancel = ruleContext.events.on('CANCEL_CONSEQUENCE', function (newRuleExecution) {
    if (newRuleExecution.concurrencyId !== ruleExecution.concurrencyId) return;
    if (newRuleExecution.execId === ruleExecution.execId) return;
    cancel();
    status = 'CANCELED';
  });

  // cancel consequence when rule gets removed
  var offRemoveRule = ruleContext.events.once('REMOVE_RULE', function () {
    cancel();
    status = 'REMOVED';
  });

  /**
   * Execute consequence
   */
  var result = void 0;
  var canceled = false;
  var status = void 0;
  var cancel = function cancel() {
    canceled = true;
  };
  var wasCanceled = function wasCanceled() {
    return canceled;
  };
  var effect = function effect(fn) {
    if (canceled) return;
    // if(rule.concurrency === 'ORDERED' && execution && execution.active !== execId){
    //   execution.effects[execId].push(() => effect(fn))
    //   return
    // }
    rule.concurrency === 'SWITCH' && ruleContext.events.trigger('CANCEL_CONSEQUENCE', ruleExecution, 'SWITCH');
    wrappedExecIds.push(ruleExecution.execId);
    fn();
    wrappedExecIds.pop();
  };
  var addRule = function addRule(name, parameters) {
    (0, _registerRule.activateSubRule)(ruleContext, name, parameters);
  };
  var removeRule = function removeRule(name) {
    var context = ruleContext.subRuleContexts[name];
    if (!context || !context.active) return;
    (0, _ruleDB.removeRule)(context);
  };
  var context = {
    setContext: function setContext() {
      throw new Error('you cannot call setContext within a consequence. check rule ' + rule.id);
    },
    getContext: function getContext(name) {
      return ruleContext.publicContext.addUntil[name] || ruleContext.publicContext.addWhen[name] || ruleContext.publicContext.global[name];
    }
  };

  var consequenceArgs = setup.createConsequenceArgs(effect, { addRule: addRule, removeRule: removeRule, effect: effect, wasCanceled: wasCanceled, context: context });

  // run the thing
  if (rule.throttle || rule.delay || rule.debounce) {
    // $FlowFixMe
    result = new _promise2.default(function (resolve) {
      if (rule.debounce && concurrency.debounceTimeoutId) clearTimeout(concurrency.debounceTimeoutId);
      concurrency.debounceTimeoutId = setTimeout(function () {
        concurrency.debounceTimeoutId = null;
        if (canceled) return resolve();
        var result = rule.consequence(action, consequenceArgs);
        // $FlowFixMe
        resolve(result);
      }, rule.throttle || rule.delay || rule.debounce);
    });
  } else {
    result = rule.consequence(action, consequenceArgs);
  }

  /**
   * setup unlisten
   */
  function unlisten() {
    rule.concurrency !== 'ONCE' && concurrency.running--;
    ruleContext.events.trigger('CONSEQUENCE_END', ruleExecution, status || 'RESOLVED');
    offCancel();
    offRemoveRule();
  }

  /**
   * Handle return types
   */

  // position:INSTEAD can extend the action if type is equal
  if ((typeof result === 'undefined' ? 'undefined' : (0, _typeof3.default)(result)) === 'object' && result !== null && result.type && rule.position === 'INSTEAD' && result.type === action.type) {
    unlisten();
    return { resolved: true, action: result };
  }

  // dispatch returned action
  else if ((typeof result === 'undefined' ? 'undefined' : (0, _typeof3.default)(result)) === 'object' && result !== null && result.type) {
      unlisten();
      // $FlowFixMe
      setup.handleConsequenceReturn(result);
    }

    // dispatch returned (promise-wrapped) action
    else if ((typeof result === 'undefined' ? 'undefined' : (0, _typeof3.default)(result)) === 'object' && result !== null && result.then) {
        // $FlowFixMe
        result.then(function (action) {
          // if(rule.concurrency === 'ORDERED') effect(() => unlisten(context, execId, cancel, concurrency))
          // else unlisten(context, execId, cancel, concurrency)
          unlisten();
          action && action.type && setup.handleConsequenceReturn(action);
        });
      }

      // register unlisten callback
      else if (typeof result === 'function') {
          var _offRemoveRule = ruleContext.events.once('REMOVE_RULE', function () {
            _offCancel();
            unlisten();
            // $FlowFixMe
            result();
          });
          var _offCancel = ruleContext.events.once('CANCEL_CONSEQUENCE', function (newRuleExecution) {
            if (newRuleExecution.concurrencyId !== ruleExecution.concurrencyId) return;
            if (newRuleExecution.execId === ruleExecution.execId) return;
            _offRemoveRule();
            unlisten();
            // $FlowFixMe
            result();
          });
        }

        // unlisten for void return
        else {
            unlisten();
          }

  return { resolved: true };
}

function matchGlob(id, glob) {
  if (glob === '*') return true;
  if (typeof glob === 'string') return glob === id;else return glob.includes(id);
}