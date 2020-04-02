'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.middleware = undefined;

var _dispatchEvent = require('./dispatchEvent');

var _dispatchEvent2 = _interopRequireDefault(_dispatchEvent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var listener = void 0;

exports.default = {
  createSetup: function createSetup(cb) {
    listener = function listener(store) {
      return cb({ store: store });
    };
  },
  createSagaArgs: function createSagaArgs(_ref) {
    var store = _ref.store;

    return {
      getState: store.getState
    };
  },
  createConditionArgs: function createConditionArgs(_ref2) {
    var store = _ref2.store;

    return {
      getState: store.getState
    };
  },
  createConsequenceArgs: function createConsequenceArgs(effect, _ref3) {
    var store = _ref3.store;

    return {
      getState: store.getState,
      dispatch: function dispatch(action) {
        effect(function () {
          return store.dispatch(action);
        });
        return action;
      }
    };
  },
  onConsequenceActionReturn: function onConsequenceActionReturn(effect, action, _ref4) {
    var store = _ref4.store;

    effect(function () {
      store.dispatch(action);
    });
    return action;
  }
};
var middleware = exports.middleware = function middleware(store) {
  listener && listener(store);
  return function (next) {
    return function (action) {
      return (0, _dispatchEvent2.default)(action, function (action) {
        return next(action);
      });
    };
  };
};