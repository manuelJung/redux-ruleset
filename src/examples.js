// navigate 500

addRule({
  id: 'SHOW_500',
  target: 'FETCH_SEARCH_FAILURE',
  position: INSERT_AFTER,
  condition: action => masterKeys.find(key => key === action.meta.searchKey),
  consequence: () => push(getErrorPath())
})

// update magazin hpp

addRule({
  id: 'MAGAZIN_HPP',
  target: 'LOCATION_CHANGE',
  position: INSERT_BEFORE,
  condition: () => isMagazinPage(window.location.pathname) && window.location.search.includes('hpp=')),
  consequence: () => removeSearchReducer(SEARCH_KEY)
}, {addOnce: true})

// scroll to top after routing

let pathname = window.location.pathname
addRule({
  id: 'SCROLL_TOP',
  target: 'LOCATION_CHANGE',
  position: INSERT_AFTER,
  condition: () => window.location.pathname !== pathname,
  consequence: () => {
    window.scrollTo(0,0)
    pathname = window.location.pathname
  }
})

// preview page

addRule({
  id: 'PREVIEW_PAGE',
  target: 'LOCATION_CHANGE',
  position: INSERT_BEFORE,
  condition: action => {
    if(!isPagePage(action.payload.pathname)) return false
    if(!action.payload.search) return false
    return true
  },
  consequence: (store, action) => {
    const objectId = getParameterByName('preview', action.payload.search)
    addRule(id: 'PREVIEW_PAGE_REPLACE',
      target: 'FETCH_SEARCH_SUCCESS',
      position: INSERT_INSTEAD,
      condition: action => action.meta.searchKey === SEARCH_KEY,
      consequence: (store, action) => {
        fetchPreview().then(response => {
          action.payload = response
          action.meta.skipRule = 'PREVIEW_PAGE_REPLACE'
          store.dispatch(action)
        })
      }, {addOnce: true})
    }
}, {addOnce: true})

// add query string to url (search route)

addRule({
  id: 'ADD_QUERY_STRING_TO_SEARCH_ROUTE',
  target: 'FETCH_SEARCH_SUCCESS',
  position: INSERT_AFTER,
  condition: action => {
    if(action.meta.searchKey !== SEARCH_KEY) return false
    if(!isSearchPath(window.locaction.pathname)) return false
    return true
  },
  consequence: (store) => {
    let queryString = getQueryString(store.getState(), SEARCH_KEY, {safe:true})
    queryString = getReducedQueryString(q)
    return {
      pathname: getSearchPath(), 
      search: window.location.search,
      hash: '#'+ queryString,
      silent: true
    }
  }
})