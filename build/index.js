'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.middleware = exports.skipRule = exports.dispatchEvent = exports.removeRule = exports.addRule = undefined;

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _ruleDB = require('./ruleDB');

var ruleDB = _interopRequireWildcard(_ruleDB);

var _middleware2 = require('./middleware');

var _middleware3 = _interopRequireDefault(_middleware2);

var _dispatchEvent = require('./dispatchEvent');

var _dispatchEvent2 = _interopRequireDefault(_dispatchEvent);

var _lazyStore = require('./utils/lazyStore');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var addRule = exports.addRule = function addRule(rule) {
  return ruleDB.addRule(rule);
};

var removeRule = exports.removeRule = function removeRule(rule) {
  return ruleDB.removeRule(rule);
};

var dispatchEvent = exports.dispatchEvent = function dispatchEvent(action, cb) {
  return (0, _lazyStore.applyLazyStore)(function (store) {
    (0, _dispatchEvent2.default)(action, store, cb, false);
  });
};

var skipRule = exports.skipRule = function skipRule(ruleId, action) {
  if (action.meta && (0, _typeof3.default)(action.meta) !== 'object') throw new Error('Expect action.meta be be an action');
  var newAction = {};
  var key = void 0;
  for (key in action) {
    newAction[key] = action[key];
  }
  if (!newAction.meta) newAction.meta = {};else for (key in action.meta) {
    newAction.meta[key] = action.meta[key];
  }

  if (!newAction.meta.skipRule) newAction.meta.skipRule = ruleId;else if (newAction.meta.skipRule === '*' || ruleId === '*') newAction.meta.skipRule = '*';else if (typeof newAction.meta.skipRule === 'string') {
    if (typeof ruleId === 'string') newAction.meta.skipRule = [ruleId, newAction.meta.skipRule];else newAction.meta.skipRule = [].concat((0, _toConsumableArray3.default)(ruleId), [newAction.meta.skipRule]);
  } else if (Array.isArray(newAction.meta.skipRule)) {
    if (typeof ruleId === 'string') newAction.meta.skipRule = [ruleId].concat((0, _toConsumableArray3.default)(newAction.meta.skipRule));else newAction.meta.skipRule = [].concat((0, _toConsumableArray3.default)(ruleId), (0, _toConsumableArray3.default)(newAction.meta.skipRule));
  }
  return newAction;
};

var middleware = exports.middleware = _middleware3.default;

exports.default = _middleware3.default;