
const buffer = []
const listeners = {
  global: []
}

const pubSub = {
  push(...items){
    items.forEach(e => {
      listeners.global.forEach(l => l(e))
      listeners[e[0]] && listeners[e[0]].forEach(l => l(e))
    })

    return buffer.push(...items)
  },

  on(key, cb, applyPastEvents){
    key = key === '*' ? 'global' : key
    if(!listeners[key]) listeners[key] = []
    listeners[key].push(cb)
    applyPastEvents && buffer.forEach(e => cb(e))
  },

  of(key, cb){
    key = key === '*' ? 'global' : key
    listeners[key] = listeners[key].filter(fn => fn !== cb)
  }
}

let id = 1

function serializeRule(rule){
  if(rule.condition) rule.condition = rule.condition.toString()
  if(rule.consequence) rule.consequence = rule.consequence.toString()
  if(rule.addWhen) rule.addWhen = rule.addWhen.toString()
  if(rule.addUntil) rule.addUntil = rule.addUntil.toString()
  return JSON.stringify(rule, null, 2)
}

window.rulesetDevtools = {
  addRule(rule){
    pubSub.push({
      type: 'ADD_RULE',
      meta: {
        id: id++,
        timestamp: Date.now(),
      },
      payload: serializeRule(rule)
    })
  },
  removeRule(rule){
    pubSub.push({
      type: 'ADD_RULE',
      meta: {
        id: id++,
        timestamp: Date.now(),
      },
      payload: serializeRule(rule)
    })
  },
  addAction(action,rule){
    pubSub.push({
      type: 'ADD_ACTION',
      meta: {
        id: id++,
        timestamp: Date.now(),
        ruleId: rule ? rule.id : null,
      },
      payload: action
    })
  },
  denyRule(rule, reason){
    pubSub.push({
      type: 'DENY_RULE',
      meta: {
        id: id++,
        timestamp: Date.now(),
        ruleId: rule.id
      },
      payload: reason
    })
  },
  execRule(rule){
    pubSub.push({
      type: 'EXEC_RULE',
      meta: {
        id: id++,
        timestamp: Date.now(),
        ruleId: rule.id
      }
    })
  }
}