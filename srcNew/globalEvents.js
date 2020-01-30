// @flow
import {removeItem} from './utils'

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
    const savedOnceList = onceList[event]
    const savedOnList   = onList[event]

    if(savedOnceList){
      onceList[event] = []
      for(i=0;i<savedOnceList.length;i++){
        const cb = savedOnceList[i]
        cb(...args)
      }
    }
    if(savedOnList){
      for(i=0;i<savedOnList.length;i++){
        const cb = savedOnList[i]
        cb(...args)
      }
    }
  },
  clearOnce(event){
    onceList[event] = []
  }
}

export default events