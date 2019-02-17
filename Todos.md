
# Todos

- validate rules
- rename position without prefix "INSERT_"
- export constants
- enshure that nested sagas will be called first
- add performance measurments (performance.mark)
- detect endless-cycles

# Resolved

- rules should not be applied when dispatching from itself
- add action (creation action) to addUntil saga
- add pubsub for devtools
- INSERT_INSTEAD should not kill own dispatched actions
- implement "extendId" logic
- correctly implement throttle, and debounce logic
- implement delay logic (= current throttle)