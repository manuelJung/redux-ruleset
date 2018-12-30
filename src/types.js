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

export type Position = 'INSERT_BEFORE' | 'INSERT_INSTEAD' | 'INSERT_AFTER'

export type LogicAdd = 'ADD_RULE' | 'ABORT' | 'REAPPLY_WHEN' | 'ADD_RULE_BEFORE'

export type LogicRemove = 'RECREATE_RULE' | 'REMOVE_RULE' | 'REAPPLY_REMOVE' | 'ABORT' | 'READD_RULE'

export type LogicConcurrency = 'DEFAULT' | 'FIRST' | 'LAST' | 'ONCE' | 'SWITCH' | 'DEBOUNCE' | 'THROTTLE'

export type ContextEvent = 'REMOVE_RULE' | 'ADD_RULE' | 'CANCEL_CONSEQUENCE' | 'CONSEQUENCE_START' | 'CONSEQUENCE_END'

export type Saga<Logic> = (
  action: (cb?:(action:Action) => mixed) => mixed,
  getState: GetState
) => Generator<any,Logic,mixed>

export type Rule = {
  id: string,
  target: '*' | string | string[],
  position?: Position,
  zIndex?: number,
  concurrency?: LogicConcurrency,
  debounce?: number,
  throttle?: number,
  condition?: (action:Action, getState:GetState) => boolean,
  consequence: ({
    store:Store, 
    action:Action, 
    addRule:AddRule,
    removeRule:RemoveRule, 
    effect: (()=>mixed)=>void
  }) => Action | Promise<Action> | Promise<void> | void | () => void,
  addOnce?: boolean,
  addWhen?: Saga<LogicAdd>,
  addUntil?: Saga<LogicRemove>,
}

export type RuleContext = {
  rule: Rule,
  childRules: Rule[],
  running: number,
  active: boolean,
  pendingSaga:boolean,
  sagaStep: number,
  on: (e:ContextEvent, cb:(payload:mixed) => void) => void,
  off: (e:ContextEvent, cb:(payload:mixed) => void) => void,
  trigger: (e:ContextEvent, payload?:mixed) => void,
}

export type AddRule = (rule:Rule) => Rule

export type RemoveRule = (rule:Rule) => void


// EVENTS

export type AddRuleEvent = {
  type: 'ADD_RULE',
  timestamp: number,
  rule: Rule,
  parentRuleId: string | null
}

export type RemoveRuleEvent = {
  type: 'REMOVE_RULE',
  timestamp: number,
  ruleId: string,
  removedByParent: boolean
}

export type ExecRuleEvent = {
  type: 'EXEC_RULE',
  timestamp: number,
  id: number,
  ruleId: string,
  actionExecId: number,
  result: 'CONDITION_MATCH' | 'CONDITION_NOT_MATCH' | 'SKIP' | 'CONCURRENCY_REJECTION'
}

export type ExecActionEvent = {
  type: 'EXEC_ACTION',
  timestamp: number,
  id: number,
  ruleId: string | null,
  ruleExecId: number | null,
  action: Action
}

export type ExecSagaEvent = {
  type: 'EXEC_SAGA',
  timestamp: number,
  id: number,
  result: 'PENDING' | 'CANCELED' | LogicAdd | LogicRemove
}

export type DispatchActionEvent = {
  type: 'DISPATCH_ACTION',
  actionExecId: number,
  removed: boolean
}

export type Event = AddRuleEvent | RemoveRuleEvent | ExecRuleEvent | ExecActionEvent | ExecSagaEvent | DispatchActionEvent