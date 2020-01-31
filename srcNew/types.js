// @flow


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
  childRules?: {[id:string]: Rule}
}

export type RuleContext = {
  rule: Rule,
  active: boolean,
  runningSaga: null | 'addWhen' | 'addUntil',
  publicContext: {
    global: {},
    addWhen: {},
    addUntil: {}
  },
  events: {
    once: (event:string, cb:Function) => Function,
    on: (event:string, cb:Function) => Function,
    trigger: (event:string, ...args:any[]) => void,
    clearOnce: (event:string) => void
  }
}

export type ActionExecution = {
  execId: number,
  ruleExecId: number | null,
  canceled: boolean,
  action: Object
}

export type RuleExecution = {
  execId: number,
  concurrencyId: string,
  actionExecId: number,
  concurrency: {[name:string]: {
    running: number,
    debounceTimeoutId: number | null,
  }}
}