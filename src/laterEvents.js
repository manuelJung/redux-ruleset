// @flow

let buffer:{[actionExecId:number]:Function[]} = {}
let added = 0

export const addCallback = (actionExecId:number, cb:()=>void) => {
  if(!buffer[actionExecId]) buffer[actionExecId] = []
  buffer[actionExecId].push(cb)
  added++
}

export const executeBuffer = (actionExecId:number) => {
  const list = buffer[actionExecId]
  if(!list && !buffer[0]) return
  if(list) {
    for(let i=0;i<list.length;i++){
      list[i]()
      added--
    }
    buffer[actionExecId] = []
  }
  if(buffer[0] && buffer[0].length){
    for(let i=0;i<buffer[0].length;i++){
      buffer[0][i]()
      added--
    }
    buffer[0] = []
  }
  if(added === 0){
    buffer = {}
  }
}

export const executeAllBuffer = () => {
  for(let id in buffer){
    executeBuffer((id:any))
  }
}