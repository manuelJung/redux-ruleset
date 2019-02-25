# React to Actions

The main purpose of redux-ruleset is to react to dispatched actions. You can define the action type(s) a rule should react to with the `target` key. The rule will react to every action-type you define here. If you set the target to `'*'` the rule will react to ANY action. This is only recommended during development, because it can slow down your application. If you do not set the target, the consequence will be executed instantly and only once. If the rule was added before you create your store, the execution will be delayed until the store is available

```javascript
import {addRule} from 'redux-ruleset'

type target = void | ActionType | ActionType[] | '*'

addRule({
  id: 'PING_PONG',
  target: 'PING', // rule will be executed for every action with type PING
  consequence: () => ({type: 'PONG'})
})

addRule({
  id: 'TRIGGER_PRODUCT_SEARCH',
  target: ['SET_COLOR_FILTER', 'SET_QUERY'], // rule will be executed for both actions
  consequence: () => ({type: 'FETCH_PRODUCTS'})
})

addRule({
  id: 'LOGGER',
  target: '*', // rule will be executed for every action
  consequence: ({action}) => console.log(action)
})

addRule({
  id: 'SAY_HI',
  target: undefined, // rule will be executed instantly (or as soon as a store is available) and only once
  consequence: () => console.log('hi')
})
```

A rule will only be touched when the target matches. This is, because rules are stored in a map, where the key is it's target. This gives redux-ruleset a huge performance boost. Even if you add dozens of rules you won't come into performance problems, because only a few rules will get touched per action. 

In Addition, it's possible to add conditions, when a rule should be executed. When the `target` matches we can control with the `condition` key, whether the consequence should be applied or not.

```javascript
import {addRule} from 'redux-ruleset'

type condition = (action, getState) => boolean

addRule({
  id: 'LOG_COLOR',
  target: 'SET_FILTER',
  condition: action => action.meta.filterKey === 'COLOR',
  consequence: ({action}) => console.log('you set color to' + action.payload)
})

dispatch({ type: 'SET_FILTER', meta: {filterKey: 'COLOR'}, payload: 'silver' })
// => you set color to silver

dispatch({ type: 'SET_FILTER', meta: {filterKey: 'SIZE'}, payload: 'big' })
// => nothing happens
```

As long as the condition does not match, the consequence won't be executed. 