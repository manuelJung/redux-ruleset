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
      dispatch: action => {
        effect(() => store.dispatch(action))
        return action
      }
    }
  },
  onConsequenceActionReturn(effect, action, {store}){
    effect(() => {
      store.dispatch(action)
    })
    return action
  }
}

export const middleware = store => {
  listener && listener(store)
  return next => action => dispatchEvent(action, action => next(action))
}