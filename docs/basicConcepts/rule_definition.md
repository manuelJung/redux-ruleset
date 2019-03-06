# What is a rule

A rule is a small independent programm, that lives inside your app. It's task is to change or alter the data-flow of your app. A rule is just an object with at least three keys: `id`, `target` and `consequence`. The id has to be a unique string and should describe the rule so you can identify it in the devtools (in development)

```javascript
import {addRule} from 'redux-ruleset'

addRule({
  id: 'LOG_ACTIONS',
  target: '*',
  consequence: ({action}) => console.log(action)
})
```

The target is the action, the rule should react to. A rule can react to one, multiple or any action (like above).

The consequence is the heart of a rule. Any task you want to perform is done within the consequence. There are several other keys available where you can manage concurrency, defining the lifetime of the rule or defining when a rule should be executed. A rule consists of serveral keys that work really well together. There is no overly complex concepts within this middleware. The basic usage of this module can be learned and fully understood within a few hours. But the real power comes from the different possible combinations of alle rule-keys. And this can take quite a time to master and requires some practive.

A very important concept of this middleware is, that a rule should be toggleable. That means, that you should be able to turn of a rule without crashing the app... TODO

