# delay

Normally a consequence gets executed immediatelly after the the target matches (synchronous). If you want to delay the execution you can set a `delay`:

```javascript
addRule({
  id: 'PING_PONG',
  target: 'PING',
  delay: 300,
  consequence: () => ({ type: 'PONG' })
})

dispatch({type: 'PING'})
await wait(100)
await wait(100)
await wait(100) // dispatch({type: 'PONG'})
```

When you set a `delay` the execution of the consequence gets delayed by the amount of millisecond you define. When the rule is removed in the meantime or the consequence gets canceled, the cosequence won't execute.