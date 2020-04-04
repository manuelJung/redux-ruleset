# AddWhen/ AddUntil saga

The rule's sagas [manage the lifetime](../basicConcepts/rule_lifetime.md) of your rule. We have two of them:

- **addWhen**: If set, the rule won't be initially active. The addWhen saga has to resolve first
- **addUntil**: starts after the rule is active. When the addUntil saga resolves it can remove the rule or set its status to inactive. This saga is also usefull for [cancelation](../advancedConcepts/cancel_rules.md)

All sagas are generators that can yield redux actions. Based on this actions you can decide what you want to do:

```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 'PING_PONG',
  target: 'PING',
  addWhen: function* (next, {getState, context}){
    yield next('START_GAME') // wait for next action with type START_GAME
    return 'ADD_RULE' // set the rule to active
  },
  addUntil: function* (next, {getState, context}){
    yield next('STOP_GAME') // wait for next action with type STOP_GAME
    return 'RECREATE_RULE' // remove the rule and reapply addWhen
  },
  consequence: () => ({ type: 'PONG' }) // dispatch a PONG for every PING
})
```

A saga always has to return a string (enum). This string describes what should happen next. Here is the complete list of the accepted returned strings for [addWhen](./saga_addWhen_return.md) and [addUntil](.saga_addUntil_return.md)

Each saga is a generator and has the following arguments:

- **next**: (fn) will yield the next action. Read the next section for more information
- **getState**: (fn) the getState method of your redux store
- **lastYield**: DEPRECATED! The addUntil saga recieves the last action that was yielded by addWhen. This will be replaced soon by a more flexible api, so don't use it any longer

## saga-argument: next

There are several ways to invoke *next()*. The normal way is:

```javascript
function*(next){
  const action = yield next(ACTION_TYPE)
}
```

If you want to listen to *any* action you can set an asterix as the action type:

```javascript
function*(next){
  const action = yield next('*')
}
```

But sometimes you want to listen only to several types:

```javascript
function*(next){
  const action = yield next([ACTION_TYPE_1, ACTION_TYPE_2])
}
```

It will yield either next action of type *ACTION_TYPE_1* or *ACTION_TYPE_2* depending on what was dispatched first.
You can also have a more granual control with the second argument:

```javascript
function*(next){
  const pathname = yield next(LOCATION_CHANGE, action => {
    if(action.pathname.includes('my-route')) return action.pathname
    else return false
  })
}
```

As you can see the next yields whatever the second argument returns. If you return a falsy value it won't yield.


### Context

Each saga recieves the [context](../advancedConcepts/context.md) object as a third argument. Here you can add data that can be picked up in your consequence or condition