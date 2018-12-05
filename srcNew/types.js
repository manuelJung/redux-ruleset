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

export type LogicRemove = 'RECREATE_RULE' | 'REMOVE_RULE' | 'REAPPLY_REMOVE' | 'ABORT'

// export type LogicConsequenceConcurrency = 'DEFAULT' | 'ORDERED' | 'FIRST' | 'LAST'

export type Saga<Logic> = (
  condition: (cb?:(action:Action) => boolean) => Promise<void>,
  getState: GetState
) => Promise<Logic>

export type Rule = {
  id?: string,
  target: '*' | string | string[],
  position?: Position,
  zIndex?: number,
  condition?: (action:Action, getState:GetState) => boolean,
  consequence: (store:Store, action:Action) => Action | Promise<Action> | Promise<void> | void | (getState:GetState) => mixed,
  addOnce?: boolean,
  addWhen?: Saga<LogicAdd>,
  addUntil?: Saga<LogicRemove>,
}

export type AddRule = (rule:Rule) => void