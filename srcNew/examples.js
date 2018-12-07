// create search page search reducer

addRule({
  id: 'SETUP_SEARCH_PAGE',
  target: 'LOCATION_CHANGE',
  consequence: () => setupSearchReducer({
    searchKey: 'search-page'
  }),
  addWhen: function*(action){
    yield action('LOCATION_CHANGE', action => isSearchPage(action.location.pathname))
    return 'ADD_RULE_BEFORE'
  },
  addUntil: function*(action){
    yield action('SETUP_SEARCH_REDUCER')
    return 'RECREATE_RULE'
  }
})

addRule({
  id: 'SEARCH',
  target: 'FETCH_REQUEST',
  consequence: (store, action) => {
    const {searchKey} = action.meta
    const config = getSearchConfig(searchKey)
    const filters = getSearchFilters(searchKey)
    return fetchFromAlgolia(config, filters).then(
      payload => fetchSuccess(searchKey, payload),
      error => fetchError(searchKey, payload)
    )
  }
})


addRule({
  id: 'TRIGGER_SEARCH_ON_FILTER_CHANGE',
  target: ['ADD_FILTER', 'REMOVE_FILTER', 'TOGGLE_FILTER', 'SET_QUERY', 'SETUP_SEARCH_PAGE'],
  consequence: (store, action) => fetch(action.meta.searchKey)
})