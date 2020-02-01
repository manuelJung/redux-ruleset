// @flow

export function removeItem <Item:*>(list:Item[], item:Item) {
  let i, j

  for (i = 0, j = 0; i < list.length; ++i) {
    if (item !== list[i]) {
      list[j] = list[i]
      j++
    }
  }

  if(j < i) list.pop()
}

export function createEventContainer () {
  const onceList = {}
  const onList = {}
  
  return {
    once(event, cb){
      if(!onceList[event]) onceList[event] = []
      onceList[event].push(cb)
      return () => removeItem(onceList[event], cb)
    },
    on(event, cb){
      if(!onList[event]) onList[event] = []
      onList[event].push(cb)
      return () => removeItem(onList[event], cb)
    },
    trigger(event, ...args){
      let i = 0
      const once = onceList[event]
      const on = onList[event]

      if(once){
        for(i=0;i<once.length;i++){
          const cb = onceList[event][i]
          cb(...args)
        }
        onceList[event] = []
      }
      if(on){
        for(i=0;i<on.length;i++){
          const cb = on[i]
          cb(...args)
        }
      }
    },
    clearOnce(event){
      onceList[event] = []
    }
  }
}

export function createRuleContext (rule:Rule):RuleContext {
  return {
    rule: rule,
    active: false,
    runningSaga: null,
    events: createEventContainer(),
    parentContext: null,
    subRuleContexts: {},
    concurrency: {},
    publicContext: {
      global: {},
      addWhen: {},
      addUntil: {}
    }
  }
}