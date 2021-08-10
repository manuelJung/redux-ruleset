// @flow
import * as t from './types'

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
        onceList[event] = []
        for(i=0;i<once.length;i++){
          const cb = once[i]
          cb(...args)
        }
      }
      if(on){
        for(i=0;i<on.length;i++){
          const cb = on[i]
          cb(...args)
        }
      }
    },
    offOnce(event, cb) {
      removeItem(onceList[event], cb)
    },
    clearOnce(event){
      onceList[event] = []
    }
  }
}

export function createRuleContext (rule:t.Rule):t.RuleContext {
  return {
    rule: rule,
    active: false,
    dropped: false,
    runningSaga: null,
    events: createEventContainer(),
    parentContext: null,
    subRuleContextCounter: 0,
    subRuleContexts: [],
    concurrency: {},
    publicContext: {
      global: {},
      addWhen: {},
      addUntil: {}
    }
  }
}