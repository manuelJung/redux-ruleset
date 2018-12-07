'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// create search page search reducer

addRule({
  id: 'SETUP_SEARCH_PAGE',
  target: 'LOCATION_CHANGE',
  consequence: function consequence() {
    return setupSearchReducer({
      searchKey: 'search-page'
    });
  },
  addWhen: /*#__PURE__*/_regenerator2.default.mark(function addWhen(action) {
    return _regenerator2.default.wrap(function addWhen$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return action('LOCATION_CHANGE', function (action) {
              return isSearchPage(action.location.pathname);
            });

          case 2:
            return _context.abrupt('return', 'ADD_RULE_BEFORE');

          case 3:
          case 'end':
            return _context.stop();
        }
      }
    }, addWhen, this);
  }),
  addUntil: /*#__PURE__*/_regenerator2.default.mark(function addUntil(action) {
    return _regenerator2.default.wrap(function addUntil$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return action('SETUP_SEARCH_REDUCER');

          case 2:
            return _context2.abrupt('return', 'RECREATE_RULE');

          case 3:
          case 'end':
            return _context2.stop();
        }
      }
    }, addUntil, this);
  })
});

addRule({
  id: 'SEARCH',
  target: 'FETCH_REQUEST',
  consequence: function consequence(store, action) {
    var searchKey = action.meta.searchKey;

    var config = getSearchConfig(searchKey);
    var filters = getSearchFilters(searchKey);
    return fetchFromAlgolia(config, filters).then(function (payload) {
      return fetchSuccess(searchKey, payload);
    }, function (error) {
      return fetchError(searchKey, payload);
    });
  }
});

addRule({
  id: 'TRIGGER_SEARCH_ON_FILTER_CHANGE',
  target: ['ADD_FILTER', 'REMOVE_FILTER', 'TOGGLE_FILTER', 'SET_QUERY', 'SETUP_SEARCH_PAGE'],
  consequence: function consequence(store, action) {
    return fetch(action.meta.searchKey);
  }
});