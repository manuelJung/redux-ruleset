// simple
addRule({
  target: 'PING',
  consequence: () => ({type:'PONG'})
})


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
  addOnce: true,
  condition: () => isMagazinPage(window.location.pathname) && window.location.search.includes('hpp=')),
  consequence: () => removeSearchReducer(SEARCH_KEY)
})

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
  addOnce: true,
  condition: action => {
    if(!isPagePage(action.payload.pathname)) return false
    if(!action.payload.search) return false
    return true
  },
  consequence: (store, action) => {
    const objectId = getParameterByName('preview', action.payload.search)
    addRule({
      id: 'PREVIEW_PAGE_REPLACE',
      target: 'FETCH_SEARCH_SUCCESS',
      position: INSERT_INSTEAD,
      addOnce: true,
      condition: action => action.meta.searchKey === SEARCH_KEY,
      consequence: (store, action) => {
        fetchPreview().then(response => {
          action.payload = response
          action.meta.skipRule = 'PREVIEW_PAGE_REPLACE'
          store.dispatch(action)
        })
      }
    })
  }
})

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

// sequences

addRule({
  id: 'FETCH_FB_STRING',
  target: 'LOCATION_CHANGE',
  condition: () => isSomePage(),
  consequenceConcurrency: 'FIRST',
  consequence: store => {
    api.on('value', payload => store.dispatch({type:'SET_STRING', payload}))
    return () => api.of('value')
  },
  addUntil: action => {
    await action('LOCATION_CHANGE', () => !isSomePage())
    return 'RECREATE_RULE'
  }
})