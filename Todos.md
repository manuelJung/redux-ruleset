
# Todos

- created "debug" flag
- validate rules
- rename position without prefix "INSERT_"
- export constants
- add action (creation action) to addUntil saga
- rules should not be applied when dispatching from itself
- enshure that nested sagas will be called first

# Resolved

- add pubsub for devtools
- INSERT_INSTEAD should not kill own dispatched actions
- implement "extendId" logic
- correctly implement throttle, and debounce logic
- implement delay logic (= current throttle)