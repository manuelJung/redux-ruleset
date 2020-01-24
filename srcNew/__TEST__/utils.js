// @flow

export function createContext (ruleAlter={}, contextAlter={}) {
  const onceList = {}
  const onList = {}
  
  const events = {
    once: jest.fn((event, cb) => {
      if(!onceList[event]) onceList[event] = []
      onceList[event].push(cb)
      return () => removeItem(onceList[event], cb)
    }),
    on: jest.fn((event, cb) => {
      if(!onList[event]) onList[event] = []
      onList[event].push(cb)
      return () => removeItem(onList[event], cb)
    }),
    trigger: jest.fn((event, ...args) => {
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
    })
  }
  const context = {
    rule: {
      id: 'UNIT_TEST',
      target: 'TEST_TYPE',
      consequence: () => ({type:'RETURN_TYPE'})
    },
    active: true,
    runningSaga: null,
    events: events
  }

  Object.assign(context.rule, ruleAlter)

  return Object.assign(context, contextAlter)
}