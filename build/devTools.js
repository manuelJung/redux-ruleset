'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addRule = addRule;
exports.removeRule = removeRule;
exports.executeRule = executeRule;
exports.executeAction = executeAction;
exports.createRuleExecutionId = createRuleExecutionId;
exports.createActionExecutionId = createActionExecutionId;


var events = [];


window.getEvents = function () {
  return events;
};

var actionExecId = 1;
var ruleExecId = 1;

function addRule(context, parentRuleId) {
  var event = {
    type: 'ADD_RULE',
    timestamp: Date.now(),
    rule: context.rule,
    parentRuleId: parentRuleId
  };
  events.push(event);
}

function removeRule(context) {
  var removedByParent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var event = {
    type: 'REMOVE_RULE',
    timestamp: Date.now(),
    ruleId: context.rule.id,
    removedByParent: removedByParent
  };
  events.push(event);
}

function executeRule(id, context, actionExecId, result) {
  var event = {
    type: 'EXEC_RULE',
    timestamp: Date.now(),
    id: id,
    ruleId: context.rule.id,
    actionExecId: actionExecId,
    result: result
  };
  events.push(event);
}

var pendingRuleExecId = null;
function executeAction(id, action, ruleExecId) {
  if (id === null) {
    pendingRuleExecId = ruleExecId || null;
    return;
  }
  var event = {
    type: 'EXEC_ACTION',
    timestamp: Date.now(),
    id: id,
    ruleExecId: pendingRuleExecId,
    action: action
  };
  pendingRuleExecId = null;
  events.push(event);
}

function createRuleExecutionId() {
  return ruleExecId++;
}

function createActionExecutionId() {
  return actionExecId++;
}