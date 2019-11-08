// @flow

export type Action = { 
  type: string,
  meta?: { skipRule?: '*' | string | string[], }
}
export type GetState = () => {}
export type Dispatch = (action:Action) => Action
export type Store = {
  getState: GetState,
  dispatch: Dispatch
}

export type Position = 'BEFORE' | 'INSTEAD' | 'AFTER'

export type LogicAdd = 'ADD_RULE' | 'ABORT' | 'REAPPLY_ADD_WHEN' | 'ADD_RULE_BEFORE'

export type LogicRemove = 'RECREATE_RULE' 
| 'RECREATE_RULE_BEFORE'
| 'REMOVE_RULE' 
| 'REMOVE_RULE_BEFORE' 
| 'REAPPLY_ADD_UNTIL' 
| 'ABORT' 
| 'READD_RULE' 
| 'READD_RULE_BEFORE'

export type LogicConcurrency = 'DEFAULT' | 'FIRST' | 'LAST' | 'ONCE' | 'SWITCH' | 'ORDERED'

export type ContextEvent = 'REMOVE_RULE' | 'ADD_RULE' | 'CANCEL_CONSEQUENCE' | 'CONSEQUENCE_START' | 'CONSEQUENCE_END'

type CTX = {
  setContext: (key:string, value:mixed) => mixed,
  getContext: (key:string) => mixed
}

export type Saga<Logic> = (
  action: (cb?:(action:Action) => mixed) => mixed,
  getState: GetState,
  context: CTX
) => Generator<any,Logic,mixed>

export type Rule = {
  id: string,
  target: '*' | string | string[],
  position?: Position,
  weight?: number,
  concurrency?: LogicConcurrency,
  debounce?: number,
  throttle?: number,
  delay?: number,
  concurrencyFilter?: (action:Action) => string,
  condition?: (action?:Action, getState:GetState, context:CTX) => boolean,
  consequence: ({
    dispatch:Dispatch,
    getState:GetState, 
    action?:Action, 
    addRule:AddRule,
    removeRule:RemoveRule, 
    effect: (()=>mixed)=>void,
    context: CTX
  }) => Action | Promise<Action> | Promise<void> | void | () => void,
  addOnce?: boolean,
  addWhen?: Saga<LogicAdd>,
  addUntil?: Saga<LogicRemove>,
}

export type RuleContext = {
  rule: Rule,
  childRules: Rule[],
  active: boolean,
  pendingSaga:boolean,
  addWhenContext:{[key:string]:mixed},
  addUntilContext:{[key:string]:mixed},
  sagaStep: number,
  concurrency: {[concurrencyId:string]: {
    running: number,
    debounceTimeoutId: TimeoutID | null,
  }},
  on: (e:ContextEvent, cb:(payload:mixed) => void) => void,
  off: (e:ContextEvent, cb:(payload:mixed) => void) => void,
  trigger: (e:ContextEvent, payload?:mixed) => void,
}

export type AddRule = (rule:Rule) => Rule

export type RemoveRule = (rule:Rule) => void
