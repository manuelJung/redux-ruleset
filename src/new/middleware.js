

export default function middleware(store:Store<any>){
  rulesBefore = createKeyedRuleSet()
  rulesInstead = createKeyedRuleSet()
  rulesAfter = createKeyedRuleSet()
  pendingRulesWhen = createYielder(store)
  pendingRulesUntil = createYielder(store)
  backlog = null

  // window.__ruleset__ && window.__ruleset__.push(
  //   ['rulesBefore', rulesBefore],
  //   ['rulesInstead', rulesInstead],
  //   ['rulesAfter', rulesAfter],
  //   ['pendingRulesWhen', pendingRulesWhen],
  //   ['pendingRulesUntil', pendingRulesUntil]
  // )

  return (next:Function) => (action:Action) => {
    let instead = false

    if(process.env.NODE_ENV === 'development' && window.rulesetDevtools){
      window.rulesetDevtools.addAction(action)
    }

    rulesInstead.forEach(action.type, rule => {
      if(!instead && applyRule(rule, action, store)){
        instead = true
      }
    })

    !instead && rulesBefore.forEach(action.type, rule => applyRule(rule, action, store))

    const result = instead ? null : next(action)

    !instead && rulesAfter.forEach(action.type, rule => applyRule(rule, action, store))

    // apply 'when' and 'until' logic
    pendingRulesWhen.yieldAction(action)
    pendingRulesUntil.yieldAction(action)

    return result
  }
}
let id = 0
function applyRule (rule, action, store) {
  const executionId = id++
  // apply rule condition -> boolean
  const executionAction = {
    type: 'RULE_CONDITION',
    id: executionId,
    ruleId: rule.id,
    timestamp: Date.now(),
    resolve: true
  }

  // apply rule execution
  const actionAction = {
    type: 'DISPATCH_ACTION',
    id: id++,
    executionId,
    ruleId,
    timestamp: Date.now(),
    action: {}
  }
}