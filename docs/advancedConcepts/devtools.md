# Devtools

*The devtools are currently under development*

Redux comes with really awesome devtools that gives deep insight what happens. But you cannot see why something happens or (more important) why something does not happen. The devtools will be able to visually present anything that happens in your rules. That includes:

- rule-lifetimes
- rule executions
- state-events
- actions
- connections between different actions
- connections between rules
- cancelations
- concurrency
- ...

When you model your dataflow exclusivly with `redux-ruleset` you will be able to visualize ANYTHING that happens in your app. That is a gold-mine for debugging. Currently the devtools are under development, but you can see the raw data in `window.__getRulesetEvents()`. 

The hardest problem I currently have is how to cleverly visualize all that data. If you are talented in visual representations of data and are interested in contributing please contact me under `manuel.jung.wwi12@gmail.com`. 