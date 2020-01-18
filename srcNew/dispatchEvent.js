// @flow

export default function dispatchEvent (action, cb) {
  let canceled = false

  forEachRuleContext(action.type, 'INSTEAD', context => {
    if(canceled) return
    const [newCanceled, newAction] = consequence(action, context)
    action = newAction
    canceled = newCanceled
  })

  canceled || forEachRuleContext(action.type, 'BEFORE', context => {
    consequence(action, context)
  })

  canceled || cb(action)

  canceled || forEachRuleContext(action.type, 'AFTER', context => {
    consequence(action, context)
  })
}