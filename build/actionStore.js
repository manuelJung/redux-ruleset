'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.extendAction = exports.getAction = exports.unregisterAction = exports.registerAction = undefined;

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var store = {};

var pendingActions = 0;

var registerAction = exports.registerAction = function registerAction(actionExecId, action) {
  store[actionExecId] = action;
  pendingActions++;
};

var unregisterAction = exports.unregisterAction = function unregisterAction(actionExecId) {
  pendingActions--;
  store[actionExecId] = undefined;
  if (pendingActions === 0) {
    store = {};
  }
};

var getAction = exports.getAction = function getAction(actionExecId) {
  return store[actionExecId] || { type: 'ERROR'

    // public api
  };
};var extendAction = exports.extendAction = function extendAction(actionExecId, extension) {
  var action = store[actionExecId];
  if (!action) throw new Error('you can only extend Actions synchronously');
  var type = action.type;
  var result = (0, _assign2.default)({}, action, extension);
  if (type !== result.type) throw new Error('you cannot change action type in `extendAction`. please use target "INSTEAD" for this');
  return result;
};