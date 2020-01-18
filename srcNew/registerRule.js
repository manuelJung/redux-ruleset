// @flow
import * as t from './types'
import {removeItem} from './utils'

const startAddWhen = context => startSaga('addWhen', context, result => {
  switch(result.logic) {
    case 'ADD_RULE': return context.once('END_ACTION_EXECUTION', () => ruleDB.addRule(context))
    case 'ADD_RULE_BEFORE': return ruleDB.addRule(context)
    case 'REAPPLY_ADD_WHEN': return context.once('END_ACTION_EXECUTION', () => startAddWhen(context))
    case 'CANCELED':
    case 'ABORT': return
    default: {
      if(process.env.NODE_ENV === 'development'){
        throw new Error(`invalid return type "${String(result.logic)}" for addWhen saga (${context.rule.id})`)
      }
    }
  }
})

const startAddUntil = context => startSaga('addUntil', context, result => {

})


export default function registerRule (rule:t.Rule) {
  const onceList = {}
  const onList = {}
  
  const events = {
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
      if(onceList[event]){
        for(i=0;i<onceList[event].length;i++){
          const cb = onceList[event][i]
          cb(...args)
        }
        onceList[event] = []
      }
      if(onList[event]){
        for(i=0;i<onList[event].length;i++){
          const cb = onList[event][i]
          cb(...args)
        }
      }
    }
  }

  const context = {
    rule: rule,
    active: !rule.addWhen,
    runningSaga: null,
    events: events
  }

  if(rule.addWhen) startAddWhen(context)
  else if(rule.addUntil) startAddUntil(context)
}