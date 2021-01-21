'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

exports.removeItem = removeItem;
exports.createEventContainer = createEventContainer;
exports.createRuleContext = createRuleContext;

var _types = require('./types');

var t = _interopRequireWildcard(_types);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function removeItem(list, item) {
  var i = void 0,
      j = void 0;

  for (i = 0, j = 0; i < list.length; ++i) {
    if (item !== list[i]) {
      list[j] = list[i];
      j++;
    }
  }

  if (j < i) list.pop();
}
function createEventContainer() {
  var onceList = {};
  var onList = {};

  return {
    once: function once(event, cb) {
      if (!onceList[event]) onceList[event] = [];
      onceList[event].push(cb);
      return function () {
        return removeItem(onceList[event], cb);
      };
    },
    on: function on(event, cb) {
      if (!onList[event]) onList[event] = [];
      onList[event].push(cb);
      return function () {
        return removeItem(onList[event], cb);
      };
    },
    trigger: function trigger(event) {
      var i = 0;
      var once = onceList[event];
      var on = onList[event];

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      if (once) {
        onceList[event] = [];
        for (i = 0; i < once.length; i++) {
          var cb = once[i];
          cb.apply(undefined, (0, _toConsumableArray3.default)(args));
        }
      }
      if (on) {
        for (i = 0; i < on.length; i++) {
          var _cb = on[i];
          _cb.apply(undefined, (0, _toConsumableArray3.default)(args));
        }
      }
    },
    offOnce: function offOnce(event, cb) {
      removeItem(onceList[event], cb);
    },
    clearOnce: function clearOnce(event) {
      onceList[event] = [];
    }
  };
}

function createRuleContext(rule) {
  return {
    rule: rule,
    active: false,
    runningSaga: null,
    events: createEventContainer(),
    parentContext: null,
    subRuleContextCounter: 0,
    subRuleContexts: [],
    concurrency: {},
    publicContext: {
      global: {},
      addWhen: {},
      addUntil: {}
    }
  };
}