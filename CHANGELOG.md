# Change Log

All notable changes to this project will be documented in this file

-----------------

2.0.0

### API changes

consequence has now 2 arguments with the action as the first:

- before: `consequence: ({action, ...rest}) => null`
- after: `consequence: (action, {...rest}) => null`

condition changed:

- before: `condition: (action, getState, context) => null`
- after: `condition: (action, {getState, context}) => null`

sagas changed:

- before: `addWhen: (next, getState, context) => null`
- after: `addWhen: (next, {getState, context}) => null`

-----------------

1.2.1

#### Bugfixes

wrap consequence return in effect


-----------------

1.2.0

totally rewrite but keep nearly the same api. this was the preparation for the v2 where api changes and devtools will be released

#### Features

- added [sub-rules](https://redux-ruleset.netlify.com/docs/advancedConcepts/sub_rules.html)


-----------------

1.1.0

### Features

- created [rule context](https://redux-ruleset.netlify.com/docs/advancedConcepts/context.html)

