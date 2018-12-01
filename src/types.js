// @flow

export type Action = { 
  type: string,
  meta?: { skipRule?: '*' | string | string[], }
}
export type GetState<State=any> = () => State
export type Dispatch = (action:Action) => Action
export type Store<S> = {
  getState: GetState<S>,
  dispatch: Dispatch
}

export type Position = 'INSERT_BEFORE' | 'INSERT_INSTEAD' | 'INSERT_AFTER'

export type LogicAdd = 'ADD_RULE' | 'ABORT' | 'REAPPLY_WHEN'

export type LogicRemove = 'REAPPLY_WHEN' | 'REMOVE_RULE' | 'REAPPLY_REMOVE' | 'ABORT'

export type YieldAction<Logic,State> = (
  condition: (cb?:(action:Action) => boolean) => Promise<void>,
  getState: GetState<State>
) => Promise<Logic>

export type Rule<S> = {
  id?: string,
  target: '*' | string | string[],
  position?: Position,
  zIndex?: number,
  condition?: (action:Action, getState:GetState<S>) => boolean,
  consequence: (store:Store<S>, action:Action) => Action | void,
  addOnce?: boolean,
  addWhen?: YieldAction<LogicAdd,S>,
  addUntil?: YieldAction<LogicRemove,S>,
}

export type AddRule<S> = (rule:Rule<S>) => void