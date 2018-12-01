// @flow

export type Action = { 
  type: string,
  meta?: { skipRule?: '*' | string | string[], }
}
type GetState<State=any> = () => State
type Dispatch = (action:Action) => Action
export type Store<S> = {
  getState: GetState<S>,
  dispatch: Dispatch
}

type Position = 'INSERT_BEFORE' | 'INSERT_INSTEAD' | 'INSERT_AFTER'

type LogicAdd = 'ADD_RULE' | 'ABORT' | 'REAPPLY_WHEN'

type LogicRemove = 'REAPPLY_WHEN' | 'REMOVE_RULE' | 'REAPPLY_REMOVE' | 'ABORT'

type YieldAction<Logic,State> = (
  condition?: (action:Action) => boolean,
  getState?: GetState<State>
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