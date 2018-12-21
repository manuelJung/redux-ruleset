addRule({
  id: 'feature/LAZY_PAGE_ROUTE',
  target: 'LOCATION_CHANGE',
  position: 'INSERT_INSTEAD',
  condition: (action, getState) => {
    if(!isPageRoute()) return false
    const {slug} = action.params
    const state = getState()
    return shouldFetch(state.pages, slug)
  },
  consequence: ({action, addRule}) => {
    nprogress.start()
    addRule({
      id: 'feature/LAZY_PAGE_ROUTE/fetcher',
      target: 'pages/FETCH_SUCCESS',
      condition: ({meta}) => meta.slug = action.params.slug,
      consequence: () => nprogress.end() && action,
      addUntil: function* (action) {
        yield action('LOCATION_CHANGE')
        return 'REMOVE_RULE'
      }
    })
    return fetchPage(action.params.slug)
  }
 })

 addRule({
  id: 'feature/PREVIEW_PAGE',
  target: 'pages/FETCH_SUCCESS',
  position: 'INSERT_INSTEAD',
  addOnce: true,
  addWhen: function*(){
    if(!isPageRoute()) return 'ABORT'
    const previewId = getParameterByName('preview')
    if(!previewId) return 'ABORT'
    return 'ADD_RULE'
  },
  consequence: ({action}) => {
    const previewId = getParameterByName('preview')
    return fetchFromCMS(previewId).then(
      payload => ({...action, payload}),
      error => action
    )
  }
 })

 addRule({
  id: 'feature/LAZY_PAGE_ROUTE',
  target: 'LOCATION_CHANGE',
  position: 'INSERT_INSTEAD',
  condition: (action, getState) => {
    if(!isPageRoute()) return false
    const {slug} = action.meta.params
    const state = getState()
    return shouldFetch(state.pages, slug)
  },
  addUntil: function* (action) {
    yield action('LOCATION_CHANGE')
    return 'REMOVE_RULE'
  },
  consequence: ({action, addRule, store}) => {
    nprogress.start()
    const {slug} = action.meta.params
    return api.fetchPage(slug).then(
      page => nprogress.end() && store.dispatch(fetchSuccess(slug, page)) && action,
      () => nprogress.end() && action
    )
  }
 })