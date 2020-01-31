import dispatchEvent from './dispatchEvent'

let listener

export default {
  createSetup(cb){
    listener = store => cb({store})
  },
  createSagaArgs({store}){
    return {
      getState: store.getState
    }
  },
  createConditionArgs({store}){
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
  onConsequenceActionReturn(action, {store}){
    store.dispatch(action)
  }
}

export const middleware = store => {
  listener && listener(store)
  return next => action => dispatchEvent(action, action => next(action))
}