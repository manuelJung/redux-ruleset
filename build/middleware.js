'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = middleware;

var _lazyStore = require('./lazyStore');

var _dispatchEvent = require('./dispatchEvent');

var _dispatchEvent2 = _interopRequireDefault(_dispatchEvent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function middleware(store) {
  (0, _lazyStore.setStore)(store);
  return function (next) {
    return function (action) {
      return (0, _dispatchEvent2.default)(action, store, function () {
        return next(action);
      }, true);
    };
  };
}