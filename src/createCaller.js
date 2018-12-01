// @flow

export default function createCaller(){
  const rules = new Map()

  return function callRule(rule, action, store, removeRule){
    // prepare args
    let abborted = false
    let modifiedStore = store
    let arg3 = undefined

    if(rule.consequenceConcurrency === 'LAST'){
      const abbort = rules.get(rule)
      abbort && abbort()
      arg3 = () => abborted
      modifiedStore = {...store}
      rules.set(rule, () => {
        abborted = true
        modifiedStore.dispatch = action => action
      })
    }

    // skip if 'skipRule' condition matched
    if(action.meta && action.meta.skipRule){
      const skipRules = Array.isArray(action.meta.skipRule) 
        ? action.meta.skipRule 
        : [action.meta.skipRule]
      if(skipRules[0] === '*' || skipRules.find(id => id === rule.id)){
        return false
      }
    }

    // skip if rule condition does not match
    if(rule.condition && !rule.condition(action, store.getState)){
      return false
    }

    // skip if only first consequence should be dispatched
    if(rule.consequenceConcurrency === 'FIRST' && rules.has(rule)){
      rules.set(rule, {})
      return false
    }

    // execute
    const result = rule.consequence(modifiedStore, action, arg3)

    // dispatch returned action
    if(typeof result === 'object' && result.type){
      store.dispatch(result)
    }

    // dispatch promise based action
    else if(typeof result === 'object' && result.then){
      result.then(action => action && action.type && store.dispatch(action)) 
    }

    // post execute logic
    if(rule.addOnce){
      removeRule(rule)
    }

    // window.__ruleset__ && window.__ruleset__.push(['applyRule', rule])

    return true
  }
}