
const buffer = []
const listeners = {
  global: []
}

window.__ruleset__ = {
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