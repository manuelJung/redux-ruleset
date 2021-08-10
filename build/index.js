'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.middleware = exports.skipRule = exports.recreateRules = exports.removeRule = exports.addRule = exports.dispatchEvent = undefined;

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _dispatchEvent = require('./dispatchEvent');

Object.defineProperty(exports, 'dispatchEvent', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_dispatchEvent).default;
  }
});

var _types = require('./types');

var t = _interopRequireWildcard(_types);

var _reduxPlugin = require('./reduxPlugin');

var _reduxPlugin2 = _interopRequireDefault(_reduxPlugin);

var _setup = require('./setup');

var _setup2 = _interopRequireDefault(_setup);

var _registerRule = require('./registerRule');

var _registerRule2 = _interopRequireDefault(_registerRule);

var _ruleDB = require('./ruleDB');

var ruleDB = _interopRequireWildcard(_ruleDB);

require('./devtools');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _setup2.default)({ plugin: _reduxPlugin2.default });

var addRule = exports.addRule = function addRule(rule) {
  return (0, _registerRule2.default)(rule);
};

var removeRule = exports.removeRule = function removeRule(rule) {
  return (0, _registerRule.dropRule)(rule);
};

var recreateRules = exports.recreateRules = function recreateRules() {
  var ruleId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '*';
  return (0, _registerRule.recreateRules)(ruleId);
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

var middleware = exports.middleware = _reduxPlugin.middleware;

exports.default = _reduxPlugin.middleware;