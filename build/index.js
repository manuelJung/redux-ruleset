'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.dispatchEvent = exports.removeRule = exports.addRule = undefined;

var _ruleDB = require('./ruleDB');

var ruleDB = _interopRequireWildcard(_ruleDB);

var _middleware = require('./middleware');

var _middleware2 = _interopRequireDefault(_middleware);

var _dispatchEvent = require('./dispatchEvent');

var _dispatchEvent2 = _interopRequireDefault(_dispatchEvent);

var _lazyStore = require('./lazyStore');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var addRule = exports.addRule = function addRule(rule) {
  return ruleDB.addRule(rule);
};

var removeRule = exports.removeRule = function removeRule(rule) {
  return ruleDB.removeRule(rule);
};

var dispatchEvent = exports.dispatchEvent = function dispatchEvent(action, cb) {
  return (0, _lazyStore.applyLazyStore)(function (store) {
    (0, _dispatchEvent2.default)(action, store, cb);
  });
};

exports.default = _middleware2.default;