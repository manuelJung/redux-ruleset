import createRuleDB from './ruleDB'
import {createEventContainer} from './utils'
import createSagaContainer from './saga'
import createRegisterRuleFn from './registerRule'
import createDispatchEvent from './dispatchEvent'
import createConsequenceFn from './consequence'
import * as t from './types'
import createDevtools from './devtools'

export default function createMiddleware<Action extends {type:string}, RootState=any>() {
  let setup = false
  const globalEvents = createEventContainer()
  createDevtools({globalEvents})
  const ruleDB = createRuleDB()
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
    middleware,
    addRule: <
      AT extends t.AT<Action>,
      OUT extends t.AT<Action>
    >(rule:t.Rule<AT,OUT,RootState,Action>) => {
      return registerRuleFn.registerRule(rule)
    },
    removeRule(rule:t.Rule<any,any,any,any>) {
      registerRuleFn.dropRule(rule)
    },
    recreateRules: (selector: string | string[]) => registerRuleFn.recreateRules(selector),
    skipRule(ruleId:'*'|string|string[], action:t.Action) {
      if(action.meta && typeof action.meta !== 'object') throw new Error('Expect action.meta be be an action')
      let newAction:t.Action = {type:'-'}
      let key:string
      for(key in action) {newAction[key] = action[key]}
      if(!newAction.meta) newAction.meta = {}
      else for (key in action.meta) {newAction.meta[key] = action.meta[key]}
    
      if(!newAction.meta.skipRule) newAction.meta.skipRule = ruleId
      else if(newAction.meta.skipRule === '*' || ruleId === '*') newAction.meta.skipRule = '*'
      else if (typeof newAction.meta.skipRule === 'string'){
        if(typeof ruleId === 'string') newAction.meta.skipRule = [ruleId, newAction.meta.skipRule]
        else newAction.meta.skipRule = [...ruleId, newAction.meta.skipRule]
      }
      else if(Array.isArray(newAction.meta.skipRule)) {
        if(typeof ruleId === 'string') newAction.meta.skipRule = [ruleId, ...newAction.meta.skipRule]
        else newAction.meta.skipRule = [...ruleId, ...newAction.meta.skipRule]
      }
      return newAction
    }
  }
}

const middleware = store => next => action => {
  console.log('dispatching', action)
  let result = next(action)
  console.log('next state', store.getState())
  return result
}