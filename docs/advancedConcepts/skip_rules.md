# Skip rules

Two rules are totally independent from each other as long as they are not nested. That means that one rule cannot affect another rule. But there is one exeption. A rule can manipulate an action in a way, that another rule won't react to it anymore. This is done by extending a action's meta:

```javascript
import {skipRule} from 'redux-ruleset'

type Action = {
  type: string,
  meta?: {
    skipRule?: '*' | RuleID | RuleID[]
  }
}

// PING_PONG rule won't react to this action
const action = {
  type: 'PING',
  meta: { skipRule: 'PING_PONG' }
}

// alteratively you can write:
const action = skipRule('PING_PONG', {type: 'PING'})

```

Redux-ruleset exports a special utility function `skipRule` for this. It takes a ruleId (or array of ruleIds) and adds them to the skipRule meta key of an action. The original action won't get touched. You can also call the skipRule utility on actions that already skip rules:

```javascript
import {skipRule} from 'redux-ruleset'

const action1 = {type:'PING'}
const action2 = skipRule('PING_PONG', action1) // { type: 'PING', meta: { skipRule: 'PING_PONG'}}
const action3 = skipRule('MULTIPLIER', action2) // { type: 'PING', meta: { skipRule: ['PING_PONG', 'MULTIPLIER']}}
const action4 = skipRule('*', action3) // { type: 'PING', meta: { skipRule: '*'}}
```


