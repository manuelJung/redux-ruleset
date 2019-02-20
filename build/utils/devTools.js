'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var events = [];

if (process.env.NODE_ENV === 'development') window.__getRulesetEvents = function () {
  return events;
};

function dispatch(event) {
  events.push(event);
  return event;
}

var addRule = exports.addRule = function addRule(rule, parentRuleId) {
  return dispatch({
    type: 'ADD_RULE',
    timestamp: Date.now(),
    rule: rule,
    parentRuleId: parentRuleId
  });
};

var removeRule = exports.removeRule = function removeRule(ruleId, removedByParent) {
  return dispatch({
    type: 'REMOVE_RULE',
    timestamp: Date.now(),
    ruleId: ruleId,
    removedByParent: removedByParent
  });
};

var execRuleStart = exports.execRuleStart = function execRuleStart(ruleId, ruleExecId, actionExecId, concurrencyFilter) {
  return dispatch({
    type: 'EXEC_RULE_START',
    timestamp: Date.now(),
    ruleExecId: ruleExecId,
    ruleId: ruleId,
    concurrencyFilter: concurrencyFilter,
    actionExecId: actionExecId
  });
};

var execRuleEnd = exports.execRuleEnd = function execRuleEnd(ruleId, ruleExecId, actionExecId, concurrencyFilter, result) {
  return dispatch({
    type: 'EXEC_RULE_END',
    timestamp: Date.now(),
    ruleExecId: ruleExecId,
    ruleId: ruleId,
    concurrencyFilter: concurrencyFilter,
    actionExecId: actionExecId,
    result: result
  });
};

var execActionStart = exports.execActionStart = function execActionStart(actionExecId, ruleExecId, action) {
  return dispatch({
    type: 'EXEC_ACTION_START',
    timestamp: Date.now(),
    actionExecId: actionExecId,
    ruleExecId: ruleExecId,
    action: action
  });
};

var execActionEnd = exports.execActionEnd = function execActionEnd(actionExecId, ruleExecId, action, result) {
  return dispatch({
    type: 'EXEC_ACTION_END',
    timestamp: Date.now(),
    actionExecId: actionExecId,
    ruleExecId: ruleExecId,
    action: action,
    result: result
  });
};

var execSagaStart = exports.execSagaStart = function execSagaStart(sagaId, ruleId, sagaType) {
  return dispatch({
    type: 'EXEC_SAGA_START',
    timestamp: Date.now(),
    sagaId: sagaId,
    ruleId: ruleId,
    sagaType: sagaType
  });
};

var execSagaEnd = exports.execSagaEnd = function execSagaEnd(sagaId, ruleId, sagaType, result) {
  return dispatch({
    type: 'EXEC_SAGA_END',
    timestamp: Date.now(),
    sagaId: sagaId,
    ruleId: ruleId,
    sagaType: sagaType,
    result: result
  });
};

var yieldSaga = exports.yieldSaga = function yieldSaga(sagaId, ruleId, sagaType, action, ruleExecId, actionExecId, result) {
  return dispatch({
    type: 'YIELD_SAGA',
    timestamp: Date.now(),
    sagaId: sagaId,
    ruleId: ruleId,
    sagaType: sagaType,
    action: action,
    ruleExecId: ruleExecId,
    actionExecId: actionExecId,
    result: result
  });
};

var dispatchAction = exports.dispatchAction = function dispatchAction(actionExecId, removed, isReduxAction, action) {
  return dispatch({
    type: 'DISPATCH_ACTION',
    actionExecId: actionExecId,
    removed: removed,
    isReduxAction: isReduxAction,
    action: action
  });
};

// type ExecRuleStart = mixed
// type ExecRuleEnd = mixed
// type ExecSagaStart = mixed
// type ExecSagaEnd = mixed
// type YieldSaga = mixed
// type ExecActionStart = mixed
// type ExecActionEnd = mixed
// type DispatchAction = mixed