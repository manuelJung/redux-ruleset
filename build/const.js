'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var BEFORE = exports.BEFORE = 'BEFORE';
var INSTEAD = exports.INSTEAD = 'INSTEAD';
var AFTER = exports.AFTER = 'AFTER';

// logic add

var ADD_RULE = exports.ADD_RULE = 'ADD_RULE';
var ABORT = exports.ABORT = 'ABORT';
var REAPPLY_WHEN = exports.REAPPLY_WHEN = 'REAPPLY_WHEN';
var ADD_RULE_BEFORE = exports.ADD_RULE_BEFORE = 'ADD_RULE_BEFORE';

// logic remove

var RECREATE_RULE = exports.RECREATE_RULE = 'RECREATE_RULE';
var REMOVE_RULE = exports.REMOVE_RULE = 'REMOVE_RULE';
var REMOVE_RULE_BEFORE = exports.REMOVE_RULE_BEFORE = 'REMOVE_RULE_BEFORE';
var REAPPLY_REMOVE = exports.REAPPLY_REMOVE = 'REAPPLY_REMOVE';
var READD_RULE = exports.READD_RULE = 'READD_RULE';
var RECREATE_RULE_BEFORE = exports.RECREATE_RULE_BEFORE = 'RECREATE_RULE_BEFORE';

// concurency

var DEFAULT = exports.DEFAULT = 'DEFAULT';
var FIRST = exports.FIRST = 'FIRST';
var LAST = exports.LAST = 'LAST';
var ONCE = exports.ONCE = 'ONCE';
var SWITCH = exports.SWITCH = 'SWITCH';
var ORDERED = exports.ORDERED = 'ORDERED';