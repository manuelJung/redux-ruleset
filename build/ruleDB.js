'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var store = {
  'INSERT_BEFORE': {},
  'INSERT_INSTEAD': {},
  'INSERT_AFTER': {}
};


var unlisteners = new _map2.default();

var storeAdd = function storeAdd(key, context) {
  var position = context.rule.position || 'INSERT_AFTER';
  if (!store[position][key]) store[position][key] = [];
  var list = store[position][key];
  if (typeof context.rule.zIndex === 'number') {
    var index = list.reduce(function (p, n, i) {
      if (typeof n.rule.zIndex !== 'number') {
        console.warn('if multiple rules are attached to a action you have to specify the order (zIndex)', n);
        return p;
      }
      if (typeof context.rule.zIndex !== 'number') return p;
      if (context.rule.zIndex < n.rule.zIndex) return i;else return p;
    }, 0);
    store[position][key] = [].concat((0, _toConsumableArray3.default)(list.slice(0, index)), [context], (0, _toConsumableArray3.default)(list.slice(index)));
  } else {
    list.push(context);
  }
};

function addRule(context) {
  if (typeof context.rule.target === 'string') {
    if (context.rule.target === '*') storeAdd('global', context);else storeAdd(context.rule.target, context);
  } else {
    context.rule.target.forEach(function (target) {
      return storeAdd(target, context);
    });
  }
  return context.rule;
}

function removeRule(rule) {
  var position = rule.position || 'INSERT_AFTER';
  if (typeof rule.target === 'string') {
    var target = rule.target;
    if (rule.target === '*') store[position].global = store[position].global.filter(function (c) {
      return c.rule !== rule;
    });else store[position][target] = store[position][target].filter(function (c) {
      return c.rule !== rule;
    });
  } else {
    rule.target.forEach(function (target) {
      store[position][target] = store[position][target].filter(function (c) {
        return c.rule !== rule;
      });
    });
  }
  var unlistenerList = unlisteners.get(rule);
  if (unlistenerList) {
    unlistenerList.forEach(function (cb) {
      return cb();
    });
  }
  return rule;
}

function forEachRuleContext(position, actionType, cb) {
  var globalRules = store[position].global;
  var boundRules = store[position][actionType];
  globalRules && globalRules.forEach(cb);
  boundRules && boundRules.forEach(cb);
}

function addUnlistenCallback(rule, cb) {
  var list = unlisteners.get(rule) || [];
  list.push(cb);
  unlisteners.set(rule, list);
}

exports.default = { addRule: addRule, removeRule: removeRule, forEachRuleContext: forEachRuleContext, addUnlistenCallback: addUnlistenCallback };