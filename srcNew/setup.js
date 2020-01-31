// @flow

let setupFinished = false
let setupFinishedListeners = []
let called = false
let sagaArgs = {}
let conditionArgs = {}
let createConsequenceArgsFn = () => ({})
let setupArgs = {}
let runningSetups = 0
let consequenceReturnFn = () => null

export default function setup({plugin}) {
  if(process.env.NODE_ENV !== 'production'){
    if(called) throw new Error('you can setup redux-ruleset only once')
  }
  called = true

  plugin.createSetup(args => {
    Object.assign(setupArgs, args)
    postSetup(plugin)
  })
}

function postSetup(plugin) {
  if(plugin.createSagaArgs) Object.assign(sagaArgs, plugin.createSagaArgs(setupArgs))
  if(plugin.createConditionArgs) Object.assign(conditionArgs, plugin.createConditionArgs(setupArgs))
  if(plugin.createConsequenceArgs) createConsequenceArgsFn = plugin.createConsequenceArgs
  if(plugin.onConsequenceActionReturn) consequenceReturnFn = result => plugin.onConsequenceActionReturn(result, setupArgs)

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

export function createConsequenceArgs(effect, defaultArgs){
  const args = createConsequenceArgsFn(effect, setupArgs)
  return Object.assign({}, defaultArgs, args)
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