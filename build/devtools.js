'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _globalEvents = require('./globalEvents');

var _globalEvents2 = _interopRequireDefault(_globalEvents);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (typeof window !== 'undefined' && window.__REDUX_RULESET_DEVTOOLS__ || process.env.NODE_ENV === 'test') {

  var send = function send(e) {
    var testFn = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {
      return null;
    };

    if (process.env.NODE_ENV === 'test') {
      return testFn();
    }
    window.__REDUX_RULESET_DEVTOOLS__(e);
  };

  _globalEvents2.default.on('DISPATCH_ACTION', function (actionExecution) {
    return send({
      type: 'DISPATCH_ACTION',
      actionExecution: actionExecution
    });
  });

  _globalEvents2.default.on('REGISTER_RULE', function (ruleContext) {
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
      }()
    });

    ruleContext.events.on('ADD_RULE', function () {
      return send({
        type: 'ADD_RULE',
        timestamp: Date.now(),
        ruleId: ruleContext.rule.id
      });
    });

    ruleContext.events.on('REMOVE_RULE', function () {
      return send({
        type: 'REMOVE_RULE',
        timestamp: Date.now(),
        ruleId: ruleContext.rule.id
      });
    });

    ruleContext.events.on('CONSEQUENCE_START', function (ruleExecution) {
      return send({
        type: 'EXEC_RULE_START',
        timestamp: Date.now(),
        ruleId: ruleContext.rule.id,
        ruleExecution: ruleExecution
      });
    });

    ruleContext.events.on('CONSEQUENCE_END', function (ruleExecution, status) {
      return send({
        type: 'EXEC_RULE_END',
        timestamp: Date.now(),
        ruleId: ruleContext.rule.id,
        ruleExecution: ruleExecution,
        status: status
      });
    });

    ruleContext.events.on('START_ACTION_EXECUTION', function (actionExecution) {
      return send({
        type: 'EXEC_ACTION_START',
        timestamp: Date.now(),
        ruleId: ruleContext.rule.id,
        actionExecution: JSON.parse((0, _stringify2.default)(actionExecution))
      });
    });

    ruleContext.events.on('END_ACTION_EXECUTION', function (actionExecution) {
      return send({
        type: 'EXEC_ACTION_END',
        timestamp: Date.now(),
        ruleId: ruleContext.rule.id,
        actionExecution: JSON.parse((0, _stringify2.default)(actionExecution))
      });
    });

    ruleContext.events.on('SAGA_START', function (sagaExecution) {
      return send({
        type: 'EXEC_SAGA_START',
        timestamp: Date.now(),
        ruleId: ruleContext.rule.id,
        sagaExecution: sagaExecution
      });
    });

    ruleContext.events.on('SAGA_END', function (sagaExecution, result) {
      return send({
        type: 'EXEC_SAGA_END',
        timestamp: Date.now(),
        ruleId: ruleContext.rule.id,
        sagaExecution: sagaExecution,
        result: result
      });
    });

    ruleContext.events.on('SAGA_YIELD', function (sagaExecution, result) {
      return send({
        type: 'YIELD_SAGA',
        timestamp: Date.now(),
        ruleId: ruleContext.rule.id,
        sagaExecution: sagaExecution,
        result: result
      });
    });
  });
}