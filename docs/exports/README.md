# Exported functions

the following functions are exported by `redux-ruleset`:
- addRule: creates a rule
- removeRule: removed a rule
- dispatchEvent: sends a redux-like action that reaches the rule-middleware
- skipRule: modifies a action to skip a specific rule
- middleware: the middleware that should be added to the redux-store


## addRule

```javascript
import {addRule} from 'redux-ruleset'

type AddRule = (rule:Rule) => Rule

addRule({
  id: 'PING_PONG',
  target: 'PING',
  consequence: () => ({type: 'PONG'})
})
```

## removeRule

```javascript
import {addRule, removeRule} from 'redux-ruleset'

type RemoveRule = (rule:Rule) => void

const rule = addRule({
  id: 'PING_PONG',
  target: 'PING',
  consequence: () => ({type: 'PONG'})
})

removeRule(rule)
```

Normally you don't have to remove a rule manually. This should be done by the [addUntil](../apiReference/saga.md) saga. 

## dispatchEvent

with *dispatchEvent* you can send your own events from anywhere to redux-ruleset. Funfact: the ruleset-middleare is just a wrapper around redux, that uses *dispatchEvent* to propagate the redux-action to redux-ruleset

```javascript
import {dispatchEvent, addRule} from 'redux-ruleset'

type DispatchEvent = (action:Action, cb?:(action:Action) => void) => void

const button = document.getElementById('btn')
const click = { type: 'CLICK_BUTTON' }

button.addEventListener('click', () => {
  dispatchEvent(click, action => {
    console.log('button click')
  })
})

addRule({
  id: 'AFTER_CLICK',
  target: 'CLICK_BUTTON'
  consequence: () => console.log('hello from after')
})

addRule({
  id: 'BEFORE_CLICK',
  target: 'CLICK_BUTTON'
  position: 'BEFORE',
  consequence: () => console.log('hello from before')
})

button.click()
// hello from before
// button click
// hello from after
```

*dispatchEvent* takes a redux-like action (an object with an *type* key) and a callback fn. This callback is only executed when no rule cancels the event. Rules that have a target of `BEFORE` are executed before the callback. Rules that have a target of `AFTER` (default behaviour) are executed after the callback. If a rule has an target of `INSTEAD` the callback won't be called.
Read more about this in the [handle state changes](../advancedConcepts/handle_state_change.md) section


## skipRule

```javascript
import {skipRule} from 'redux-ruleset'

type SkipRule = (RuleId | RuleId[] | '*') => void

const action = { type: 'PING' }

// examples
skipRule('PING_PONG', action) // => { type: 'PING', meta: { skipRule: 'PING_PONG' }}
skipRule(['PING_PONG'], action) // => { type: 'PING', meta: { skipRule: ['PING_PONG'] }}
skipRule('*', action) // => { type: 'PING', meta: { skipRule: '*' }}

```

*skipRule* extends a given action. When a rules tries to react to a action it first looks if it is listed in the `meta.skipRule` property. If so, it won't react to the action. You can read more about this in the [skip rule](../advancedConcepts/skip_rules.md) section

## middleware

```javascript
import {applyMiddleware, compose, createStore} from 'redux'
import {middleware as ruleMiddleware} from 'redux-ruleset'

const middlewares = [ruleMiddleware]
const enhancers = []

const store = createStore(
  rootReducer,
  initialState,
  compose(
    applyMiddleware(...middlewares),
    ...enhancers
  )
)
```

When you create your store you should add the redux-ruleset middleware to your middlewares. 