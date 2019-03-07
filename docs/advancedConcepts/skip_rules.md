# Skip rules

Two rules are totally independent from each other as long as the are not nested. That means that one rule cannot affect another rule. But there is one exeption. A rule can manipulate an action in a way, that another rule won't react to it anymore. This is done by extending a action's meta:

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

Redux-ruleset exports a special utility function `skipRule` for this. It takes a ruleId (or array of ruleIds) and adds them to the skipRule meta key of an action. The original action won't get touched.

So when is this usefull? Let's look at a real world example:

```javascript
import {addRule, skipRule} from 'redux-ruleset'

addRule({
  
})
```

