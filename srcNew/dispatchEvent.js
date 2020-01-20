// @flow
import consequence, {getCurrentRuleExecId} from './consequence'

let execId = 1

export default function dispatchEvent (action, cb) {
  
  const actionExecution = {
    execId: execId++,
    ruleExecId: getCurrentRuleExecId(),
    canceled: false
  }

  forEachRuleContext(action.type, 'INSTEAD', context => {
    if(canceled) return
    const [newCanceled, newAction] = consequence(action, context)
    action = newAction
    actionExecution.canceled = newCanceled
  })

  actionExecution.canceled || forEachRuleContext(action.type, 'BEFORE', context => {
    consequence(action, context)
  })

  actionExecution.canceled || cb(action)

  actionExecution.canceled || forEachRuleContext(action.type, 'AFTER', context => {
    consequence(action, context)
  })
}