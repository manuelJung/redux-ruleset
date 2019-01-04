'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = validate;

var _ruleDB = require('./ruleDB');

function validate(rule) {
  if (!rule.id) {
    throw new Error('rules must have an id');
  }
  var context = (0, _ruleDB.getRuleContext)(rule);
  if (context && context.active) {
    throw new Error('found an active rule with same id "' + rule.id + '". Either you used the same id for multiple rules or you tried to add an already added rule');
  }
  if (!rule.target) {
    throw new Error('rules must have a target. Check your rule ' + rule.id);
  }
  if (!rule.consequence) {
    throw new Error('rules must have a consequence. Check your rule ' + rule.id);
  }
  if (rule.addOnce && rule.addUntil) {
    throw new Error('it does not make sense to for a rule to have a addOnce flag and a addUntil fn. Check your rule ' + rule.id);
  }
}