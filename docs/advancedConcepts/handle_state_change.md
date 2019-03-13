# React to component state changes

Redux middlewares are really mighty for anything that has to do with your redux store. But they are pretty useless for anything else. That is espacially true for the inner state of components. When you open a dropdown you don't want to hold this state in your redux-store (too much boilerplate). But it would be nice to react to the state change. This middleware comes with a solution for this problem.

The following examples are all written in React, but can be translated to any similar libary. In fact, this techique can be used to push anything you want to the middleware

```javascript
import {dispatchEvent} from 'redux-ruleset'

class Dropdown extends React.Component {
  state = { open: false }

  open = () => {
    dispatchEvent({ type: 'Dropdown/OPEN' }, () => this.setState({ open: true }))
  }

  close = () => {
    dispatchEvent({ type: 'Dropdown/CLOSE' })
    this.setState({ open: false })
  }

  toggle = () => this.state.open ? this.open() : this.close()

  render = () => (
    <div className='Dropdown'>
      <div className='label' onClick={this.toggle}>
        {this.props.label}
      </div>
      {this.state.open && this.props.children}
    </div>
  )
}

// later
addRule({
  id: 'LOG_DROPDOWN_STATE',
  target: ['Dropdown/OPEN', 'Dropdown/CLOSE'],
  consequence: ({action}) => {
    if(action.type === 'Dropdown/OPEN') console.log('opened dropdown')
    else console.log('closed dropdown')
  }
})
```

Redux-ruleset exports a special helper `dispatchEvent` that accepts two arguments. The first one is a redux like action that will be treated like a redux action, the second one is a callback that will be executed (if not canceled by a rule). Note the two different implementations in the above example. If we wrap the actual task in the second argument we can correctly handle the `position` when a rule should be executed (*BEFORE* *INSTEAD* or *AFTER*). We can even cancel the state-event (position *INSTEAD*). In the close handler this is not possible since `dispatchEvent` doesn't wrap the *setState* method call

This can be pretty useful in many situations, e.g you can fetch data when a dropdown was opened.

I would recommend to use a different naming for state actions to distinguish between state-actions and redux-actions. In our applications we use the naming `ComponentName/ACTION` (like above). 