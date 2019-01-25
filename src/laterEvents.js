// @flow

let buffer = []

export const addCallback = (cb:()=>void) => {
  buffer.push(cb)
}

export const executeBuffer = () => {
  if(!buffer.length) return
  for(let i=0;i<buffer.length;i++){
    buffer[i]()
  }
  buffer = []
}