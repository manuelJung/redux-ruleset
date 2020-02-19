'use strict';

var _globalEvents = require('./globalEvents');

var _globalEvents2 = _interopRequireDefault(_globalEvents);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (typeof window !== 'undefined' && window.RULESET_DEVTOOLS || process.env.NODE_ENV === 'test') {
  var buffer = [];

  var send = function send(e) {
    var testFn = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {
      return null;
    };

    if (process.env.NODE_ENV === 'test') {
      return testFn();
    }
    if (window.__REDUX_RULESET_DEVTOOLS__) {
      if (buffer.length) {
        buffer.forEach(function (row) {
          return window.__REDUX_RULESET_DEVTOOLS__(row);
        });
        buffer.length = [];
      }
      window.__REDUX_RULESET_DEVTOOLS__(e);
    } else {
      buffer.push(e);
    }
  };

  // globalEvents.on('DISPATCH_ACTION', actionExecution => send({
  //   type: 'DISPATCH_ACTION',
  //   timestamp: Date.now(),
  //   actionExecution
  // }))
  _globalEvents2.default.on('DISPATCH_ACTION', function (actionExecution) {
    return send({
      type: 'DISPATCH_ACTION',
      timestamp: Date.now(),
      actionExecId: actionExecution.execId,
      removed: actionExecution.canceled,
      isReduxAction: true,
      action: actionExecution.action
    });
  });

  // globalEvents.on('START_ACTION_EXECUTION', actionExecution => send({
  //   type: 'EXEC_ACTION_START',
  //   timestamp: Date.now(),
  //   ruleId: ruleContext.rule.id,
  //   actionExecution: JSON.parse(JSON.stringify(actionExecution))
  // }))
  _globalEvents2.default.on('START_ACTION_EXECUTION', function (actionExecution) {
    return send({
      type: 'EXEC_ACTION_START',
      timestamp: Date.now(),
      actionExecId: actionExecution.execId,
      ruleExecId: actionExecution.ruleExecId,
      action: actionExecution.action
    });
  });

  // globalEvents.on('END_ACTION_EXECUTION', actionExecution => send({
  //   type: 'EXEC_ACTION_END',
  //   timestamp: Date.now(),
  //   ruleId: ruleContext.rule.id,
  //   actionExecution: JSON.parse(JSON.stringify(actionExecution))
  // }))
  _globalEvents2.default.on('END_ACTION_EXECUTION', function (actionExecution) {
    return send({
      type: 'EXEC_ACTION_END',
      timestamp: Date.now(),
      actionExecId: actionExecution.execId,
      ruleExecId: actionExecution.ruleExecId,
      action: actionExecution.action,
      result: actionExecution.canceled ? 'ABORTED' : 'DISPATCHED'
    });
  });

  _globalEvents2.default.on('REGISTER_RULE', function (ruleContext) {
    var parentRuleId = ruleContext.parentContext ? ruleContext.parentContext.rule.id : null;
    send({
      type: 'REGISTER_RULE',
      timestamp: Date.now(),
      rule: function () {
        var rule = ruleContext.rule;
        var result = {};
        for (var key in rule) {
          if (typeof rule[key] !== 'function') result[key] = rule[key];else result[key] = rule[key].toString();
        }
        return result;
      }(),
      parentRuleId: parentRuleId
    });

    ruleContext.events.on('ADD_RULE', function () {
      return send({
        type: 'ADD_RULE',
        timestamp: Date.now(),
        ruleId: ruleContext.rule.id,
        parentRuleId: parentRuleId
      });
    });

    ruleContext.events.on('REMOVE_RULE', function () {
      return send({
        type: 'REMOVE_RULE',
        timestamp: Date.now(),
        ruleId: ruleContext.rule.id,
        removedByParent: false // TODO
      });
    });

    // ruleContext.events.on('CONSEQUENCE_START', ruleExecution => send({
    //   type: 'EXEC_RULE_START',
    //   timestamp: Date.now(),
    //   ruleId: ruleContext.rule.id,
    //   ruleExecution
    // }))
    ruleContext.events.on('CONSEQUENCE_START', function (ruleExecution) {
      return send({
        type: 'EXEC_RULE_START',
        timestamp: Date.now(),
        ruleExecId: ruleExecution.execId,
        ruleId: ruleContext.rule.id,
        actionExecId: ruleExecution.actionExecId,
        concurrencyFilter: ruleExecution.concurrencyId
      });
    });

    // ruleContext.events.on('CONSEQUENCE_END', (ruleExecution,status) => send({
    //   type: 'EXEC_RULE_END',
    //   timestamp: Date.now(),
    //   ruleId: ruleContext.rule.id,
    //   ruleExecution,
    //   status
    // }))
    ruleContext.events.on('CONSEQUENCE_END', function (ruleExecution, status) {
      return send({
        type: 'EXEC_RULE_END',
        timestamp: Date.now(),
        ruleExecId: ruleExecution.execId,
        ruleId: ruleContext.rule.id,
        actionExecId: ruleExecution.actionExecId,
        concurrencyFilter: ruleExecution.concurrencyId,
        result: status
      });
    });

    // ruleContext.events.on('SAGA_START', sagaExecution => send({
    //   type: 'EXEC_SAGA_START',
    //   timestamp: Date.now(),
    //   ruleId: ruleContext.rule.id,
    //   sagaExecution
    // }))
    ruleContext.events.on('SAGA_START', function (sagaExecution) {
      return send({
        type: 'EXEC_SAGA_START',
        timestamp: Date.now(),
        sagaId: sagaExecution.execId,
        ruleId: ruleContext.rule.id,
        sagaType: sagaExecution.sagaType === 'addWhen' ? 'ADD_WHEN' : 'ADD_UNTIL'
      });
    });

    ruleContext.events.on('SAGA_END', function (sagaExecution, result) {
      return send({
        type: 'EXEC_SAGA_END',
        timestamp: Date.now(),
        sagaId: sagaExecution.execId,
        ruleId: ruleContext.rule.id,
        sagaType: sagaExecution.sagaType === 'addWhen' ? 'ADD_WHEN' : 'ADD_UNTIL',
        result: result
      });
    });

    ruleContext.events.on('SAGA_YIELD', function (sagaExecution, actionExecution, result) {
      return send({
        type: 'YIELD_SAGA',
        timestamp: Date.now(),
        sagaId: sagaExecution.execId,
        ruleId: ruleContext.rule.id,
        sagaType: sagaExecution.sagaType === 'addWhen' ? 'ADD_WHEN' : 'ADD_UNTIL',
        action: actionExecution ? actionExecution.action : null,
        ruleExecId: actionExecution ? actionExecution.ruleExecId : null,
        actionExecId: actionExecution ? actionExecution.execId : null,
        result: result ? result === 'CANCELED' ? result : 'RESOLVE' : 'REJECT'
      });
    });
  });
}