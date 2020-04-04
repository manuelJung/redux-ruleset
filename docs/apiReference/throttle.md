# throttle

Next to handling [concurrencies](../basicConcepts/handle_concurrency.md) you can also throttle the the execution of a rule. But that also means, that your execution gets delayed by the numer of millisecond you set. Normally you could handle concurrency way better by the [concurrency](./concurrency.md) key. But there can be situations where it might be usefull to not execute the consequence on every action. E.g you want to create a autocomplete feature:

```javascript
addRule({
  id: 'search/AUTOCOMPLETE',
  target: 'search/SET_SEARCH',
  throttle: 300,
  concurrency: 'SWITCH',
  consequence: action => api.searchSuggestions(action.payload).then(
    suggestions => actions.setSuggestions(suggestions),
    error => actions.setSuggestions([])
  )
})

dispatch({type:'search/SET_SEARCH', payload: 'r'}) 
await wait(200)
dispatch({type:'search/SET_SEARCH', payload: 're'})
await wait(200) // consequence gets called with payload 're'
dispatch({type:'search/SET_SEARCH', payload: 'red'})
await wait(200) 
dispatch({type:'search/SET_SEARCH', payload: 'redu'})
await wait(200) // consequence gets called with payload 'redu'
dispatch({type:'search/SET_SEARCH', payload: 'redux'})
await wait(400) // consequence gets called with payload 'redux'
```

Throttle works as follows: Whenever the *target* gets dispatched nothing happens, but the rule will wait until the throttle time is over. When the the same *target* gets dispatched again the old consequence won't get called and the timer remains untouched (timer won't reset to zero). Whenever the timer reaches its limit the last consequence gets executed