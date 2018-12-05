'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _middleware = require('./middleware');

Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_middleware).default;
  }
});
Object.defineProperty(exports, 'addRule', {
  enumerable: true,
  get: function get() {
    return _middleware.addRule;
  }
});
Object.defineProperty(exports, 'removeRule', {
  enumerable: true,
  get: function get() {
    return _middleware.removeRule;
  }
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }