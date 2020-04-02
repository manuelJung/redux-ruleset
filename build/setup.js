'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.testing = undefined;

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

exports.default = setup;
exports.onSetupFinished = onSetupFinished;
exports.createConsequenceArgs = createConsequenceArgs;
exports.handleConsequenceReturn = handleConsequenceReturn;
exports.createConditionArgs = createConditionArgs;
exports.createSagaArgs = createSagaArgs;

var _types = require('./types');

var t = _interopRequireWildcard(_types);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var setupFinished = false;

var setupFinishedListeners = [];
var called = false;
var sagaArgs = {};
var conditionArgs = {};
var createConsequenceArgsFn = function createConsequenceArgsFn() {
  return {};
};
var setupArgs = {};
var runningSetups = 0;
var consequenceReturnFn = function consequenceReturnFn() {
  return null;
};

function setup(_ref) {
  var plugin = _ref.plugin;

  if (process.env.NODE_ENV !== 'production') {
    if (called) throw new Error('you can setup redux-ruleset only once');
  }
  called = true;

  plugin.createSetup(function (args) {
    (0, _assign2.default)(setupArgs, args);
    postSetup(plugin);
  });
}

function postSetup(plugin) {
  if (plugin.createSagaArgs) (0, _assign2.default)(sagaArgs, plugin.createSagaArgs(setupArgs));
  if (plugin.createConditionArgs) (0, _assign2.default)(conditionArgs, plugin.createConditionArgs(setupArgs));
  if (plugin.createConsequenceArgs) createConsequenceArgsFn = plugin.createConsequenceArgs;
  if (plugin.onConsequenceActionReturn) consequenceReturnFn = function consequenceReturnFn(effect, result) {
    return plugin.onConsequenceActionReturn(effect, result, setupArgs);
  };

  setupFinished = true;
  for (var j = 0; j < setupFinishedListeners.length; j++) {
    var cb = setupFinishedListeners[j];
    cb();
  }
}

function onSetupFinished(cb) {
  if (setupFinished) cb();else setupFinishedListeners.push(cb);
}

function createConsequenceArgs(effect, defaultArgs) {
  var args = createConsequenceArgsFn(effect, setupArgs);
  return (0, _assign2.default)({}, defaultArgs, args);
}

function handleConsequenceReturn(effect, action) {
  consequenceReturnFn(effect, action);
}

function createConditionArgs(defaultArgs) {
  return (0, _assign2.default)({}, defaultArgs, conditionArgs);
}

function createSagaArgs(defaultArgs) {
  return (0, _assign2.default)({}, defaultArgs, sagaArgs);
}

var testing = exports.testing = {
  getConsequenceReturnFn: function getConsequenceReturnFn() {
    return consequenceReturnFn;
  }
};