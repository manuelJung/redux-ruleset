import globalEvents from './globalEvents'

if((typeof window !== 'undefined' && window.__REDUX_RULESET_DEVTOOLS__) || process.env.NODE_ENV === 'test'){
  
  const send = (e,testFn=()=>null) => {
    if(process.env.NODE_ENV === 'test') {
      return testFn()
    }
    window.__REDUX_RULESET_DEVTOOLS__(e)
  }

  globalEvents.on('DISPATCH_ACTION', actionExecution => send({
    type: 'DISPATCH_ACTION',
    actionExecution
  }))

  globalEvents.on('REGISTER_RULE', ruleContext => {
    send({
      type: 'REGISTER_RULE',
      timestamp: Date.now(),
      rule: (() => {
        const rule = ruleContext.rule
        let result = {}
        for(let key in rule){
          if(typeof rule[key] !== 'function') result[key] = rule[key]
          else result[key] = rule[key].toString()
        }
        return result
      })(),
    })

    ruleContext.events.on('ADD_RULE', () => send({
      type: 'ADD_RULE',
      timestamp: Date.now(),
      ruleId: ruleContext.rule.id
    }))

    ruleContext.events.on('REMOVE_RULE', () => send({
      type: 'REMOVE_RULE',
      timestamp: Date.now(),
      ruleId: ruleContext.rule.id
    }))

    ruleContext.events.on('CONSEQUENCE_START', ruleExecution => send({
      type: 'EXEC_RULE_START',
      timestamp: Date.now(),
      ruleId: ruleContext.rule.id,
      ruleExecution
    }))

    ruleContext.events.on('CONSEQUENCE_END', (ruleExecution,status) => send({
      type: 'EXEC_RULE_END',
      timestamp: Date.now(),
      ruleId: ruleContext.rule.id,
      ruleExecution,
      status
    }))

    ruleContext.events.on('START_ACTION_EXECUTION', actionExecution => send({
      type: 'EXEC_ACTION_START',
      timestamp: Date.now(),
      ruleId: ruleContext.rule.id,
      actionExecution: JSON.parse(JSON.stringify(actionExecution))
    }))

    ruleContext.events.on('END_ACTION_EXECUTION', actionExecution => send({
      type: 'EXEC_ACTION_END',
      timestamp: Date.now(),
      ruleId: ruleContext.rule.id,
      actionExecution: JSON.parse(JSON.stringify(actionExecution))
    }))

    ruleContext.events.on('SAGA_START', sagaExecution => send({
      type: 'EXEC_SAGA_START',
      timestamp: Date.now(),
      ruleId: ruleContext.rule.id,
      sagaExecution
    }))

    ruleContext.events.on('SAGA_END', (sagaExecution,result) => send({
      type: 'EXEC_SAGA_END',
      timestamp: Date.now(),
      ruleId: ruleContext.rule.id,
      sagaExecution,
      result
    }))

    ruleContext.events.on('SAGA_YIELD', (sagaExecution,result) => send({
      type: 'YIELD_SAGA',
      timestamp: Date.now(),
      ruleId: ruleContext.rule.id,
      sagaExecution,
      result
    }))
  })
}
