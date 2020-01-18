// @flow

let listener

const ReduxPlugin = {
  createSetup(cb){
    listener = store => cb({store})
  },
  createSagaArgs({store}){
    return {
      getState: store.getState
    }
  },
  createConsequenceArgs(effect, {store}){
    return {
      getState: store.getState,
      dispatch: (...args) => effect(() => store.dispatch(...args))
    }
  },
  onConsequenceReturn(action, {store}){
    store.dispatch(action)
  }
}

const middleware = store => {
  listener && listener(store)
  return next => action => dispatchEvent(action, store, action => next(action))
}