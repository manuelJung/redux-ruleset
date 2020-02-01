'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = dispatchEvent;

var _types = require('./types');

var t = _interopRequireWildcard(_types);

var _consequence = require('./consequence');

var _consequence2 = _interopRequireDefault(_consequence);

var _ruleDB = require('./ruleDB');

var _globalEvents = require('./globalEvents');

var _globalEvents2 = _interopRequireDefault(_globalEvents);

var _saga = require('./saga');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var execId = 1;


var cycle = {
  waiting: false,
  step: 0
};

function dispatchEvent(action) {
  var cb = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {
    return null;
  };

  cycle.step++;

  // detect endless recursive loops
  if (process.env.NODE_ENV !== 'production') {
    var next = function next(fn) {
      return setTimeout(fn, 1);
    };
    if (!cycle.waiting) {
      cycle.waiting = true;
      next(function () {
        cycle.waiting = false;
        cycle.step = 0;
      });
    }
    if (cycle.step > 800) console.warn('detected endless cycle with action', action);
    if (cycle.step > 810) throw new Error('detected endless cycle');
  }

  var actionExecution = {
    execId: execId++,
    ruleExecId: (0, _consequence.getCurrentRuleExecId)(),
    canceled: false,
    history: [],
    action: action
  };

  _globalEvents2.default.trigger('START_ACTION_EXECUTION', actionExecution);

  (0, _ruleDB.forEachRuleContext)(action.type, 'INSTEAD', function (context) {
    if (actionExecution.canceled) return;
    var newAction = (0, _consequence2.default)(actionExecution, context);
    if (newAction) {
      actionExecution.history.push({ action: action, context: context });
      // $FlowFixMe
      action = newAction;
    } else actionExecution.canceled = true;
  });

  if (!actionExecution.canceled) {
    (0, _saga.yieldAction)(actionExecution);

    (0, _ruleDB.forEachRuleContext)(action.type, 'BEFORE', function (context) {
      (0, _consequence2.default)(actionExecution, context);
    });

    _globalEvents2.default.trigger('DISPATCH_ACTION', actionExecution);
    cb(action);

    (0, _ruleDB.forEachRuleContext)(action.type, 'AFTER', function (context) {
      (0, _consequence2.default)(actionExecution, context);
    });
  }

  _globalEvents2.default.trigger('END_ACTION_EXECUTION', actionExecution);
}