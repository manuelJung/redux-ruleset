// @flow

let setupFinished = false
let setupFinishedListeners = []
let called = false
let sagaArgs = {}
let conditionArgs = {}
let consequenceArgs = {}
let setupArgs = {}
let runningSetups = 0
let consequenceReturnFn = () => null

export default function setup({plugins}) {
  if(process.env.NODE_ENV !== 'production'){
    if(called) throw new Error('you can setup redux-ruleset only once')
  }
  called = true
  
  // createSetup
  for (let i=0;i<plugins.length;i++) {
    if(!plugins[i].createSetup) continue
    runningSetups++
    plugins[i].createSetup(args => {
      Object.assign(setupArgs, args)
      runningSetups--
      if(runningSetups === 0) postSetup(plugins)
    })
  }

  if(runningSetups === 0) postSetup(plugins)
}

function postSetup(plugins) {
  for (let i=0;i<plugins.length;i++) {
    const plugin = plugins[i]
    if(plugin.createSagaArgs) Object.assign(sagaArgs, plugin.createSagaArgs(setupArgs))
    if(plugin.createConditionArgs) Object.assign(conditionArgs, plugin.createConditionArgs(setupArgs))
    if(plugin.createConsequenceArgs) Object.assign(consequenceArgs, plugin.createConsequenceArgs(setupArgs))
    if(plugin.onConsequenceActionReturn) consequenceReturnFn = result => plugin.onConsequenceActionReturn(result, setupArgs)
  }

  setupFinished = true
  for(let j=0;j<setupFinishedListeners.length;j++){
    const cb = setupFinishedListeners[j]
    cb()
  }
}

export function onSetupFinished(cb){
  if(setupFinished) cb()
  else setupFinishedListeners.push(cb)
}

export function createConsequenceArgs(defaultArgs){
  return Object.assign({}, defaultArgs, consequenceArgs)
}

export function handleConsequenceReturn(action){
  consequenceReturnFn(action)
}

export function createConditionArgs(defaultArgs){
  return Object.assign({}, defaultArgs, conditionArgs)
}

export function createSagaArgs(defaultArgs){
  return Object.assign({}, defaultArgs, sagaArgs)
}

export const testing = {
  getConsequenceReturnFn: () => consequenceReturnFn
}