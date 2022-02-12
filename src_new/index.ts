import createRuleDB from './ruleDB'
import {createEventContainer} from './utils'
import createSagaContainer from './saga'
import createRegisterRuleFn from './registerRule'
import createDispatchEvent from './dispatchEvent'
import createConsequenceFn from './consequence'

export default function createMiddleware<Action extends {type:string}>() {
  let setup = false
  const ruleDB = createRuleDB()
  const globalEvents = createEventContainer()
  let sagaContainer:ReturnType<typeof createSagaContainer>;
  let registerRuleFn:ReturnType<typeof createRegisterRuleFn>;
  let dispatchEvent:ReturnType<typeof createDispatchEvent>;
  let consequenceFn:ReturnType<typeof createConsequenceFn>;

  const middleware = (store:any) => {
    if(!setup) {
      sagaContainer = createSagaContainer({store})
      registerRuleFn = createRegisterRuleFn({
        removeRule: ruleDB.removeRule,
        addRule: ruleDB.addRule,
        globalEvents: globalEvents,
        startSaga: sagaContainer.startSaga
      })
      consequenceFn = createConsequenceFn({
        store: store,
        activateSubRule: registerRuleFn.activateSubRule,
        removeRuleFromRuleDB: ruleDB.removeRule,
      })
      dispatchEvent = createDispatchEvent({
        globalEvents: globalEvents,
        getCurrentRuleExecId: consequenceFn.getCurrentRuleExecId,
        forEachRuleContext: ruleDB.forEachRuleContext,
        consequence: consequenceFn.consequence,
        yieldAction: sagaContainer.yieldAction,
      })
      setup = true
    }

    return (next:any) => (action:any) => dispatchEvent(action, next)
  }

  return {
    middleware
  }
}

const middleware = store => next => action => {
  console.log('dispatching', action)
  let result = next(action)
  console.log('next state', store.getState())
  return result
}