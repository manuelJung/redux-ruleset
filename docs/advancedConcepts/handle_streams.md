# Handle streams

As far as you've learned, `consequence` has two different return types: Actions or promise-wrapped actions Everything else won't get picked up. But there is a third return type: a function. This is a callback function that will be called whenever the consequence is canceled or the rule is removed.
That's perfect when working with sockets or data-streams:

```javascript
import {addRule} from 'redux-ruleset'

/*
Given the game has stared
Then we want to create a new monster every second
*/
addRule({
  id: 'MONSTER_CREATOR',
  target: 'START_GAME',
  concurrency: 'FIRST',
  addUntil: function* (next) {
    yield next('STOP_GAME')
    return 'RECREATE_RULE'
  },
  consequence: (_,{dispatch}) => {
    const intervalId = setInterval(() => {
      dispatch({ type: 'SPAWN_MONSTER' })
    }, 1000)

    // unlisten, when rule will be removed or consequence gets canceled
    return () => {
      clearInterval(intervalId)
    }
  }
})
```

In the above example we created a rule that should spawn a monster every second after our game has started. After *START_GAME* gets dispatched we create an interval that dispatches a *SPAWN_MONSTER* action every second. We return a function that can clear this interval. It will get called as soon as the *STOP_GAME* action was dispatched.

Note the `concurrency` *FIRST*. A consequence that returns a function is treated as a infinite running consequence. When we dispatch a second *START_GAME* before we recieved a *STOP_GAME* the consequence won't get called again since the first one is still running

Let's look at another example:

```javascript
import {addRule} from 'redux-ruleset'

/*
Given I open a chat,
Then I want to open a socket that adds new chat-messsages as soon, as my chat-partner writes
*/
addRule({
  id: 'UPDATE_CHAT',
  target: 'SET_ACTIVE_CHAT' // { type: 'SET_ACTIVE_CHAT', userId: 3 },
  concurrency: 'LAST',
  addUntil: function* (next) {
    yield next('CLOSE_CHAT')
    return 'RECREATE_RULE'
  },
  consequence: ({dispatch, action}) => {
    const {userId} = action
    const clearSocket = api.openChatSocket(userId, msg => {
      dispatch({ type: 'ADD_CHAT_MESSAGE', meta: {userId}, payload: msg })
    })

    return () => clearSocket()
  }
})
```

Here we set the `concurrency` to *LAST*. That means as soon as we recieve a second *SET_ACTIVE_CHAT* we clear or first socket and open a new one with new new userId. So this rule only keeps the most recent socket open.

*FIRST* and *LAST* `concurrency` works perfectly with rules that return a unlisten callback to either keep only the first socket open or the most recent one