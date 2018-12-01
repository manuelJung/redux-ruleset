// @flow
import {createRuleSet, createKeyedRuleSet} from '../ruleSet'

declare var describe: any
declare var test: any
declare var expect: any
declare var jest: any

describe('ruleSet', () => {
  function inspect(ruleSet){
    const list = []
    ruleSet.forEach(rule => list.push(rule))
    return list
  }
  test('add 1 rule', () => {
    const ruleSet = createRuleSet()
    ruleSet.add({
      target: 'ACTION',
      consequence: () => undefined
    })
    const list = inspect(ruleSet)
    expect(list.length).toBe(1)
  })

  test('multiple rules require a zIndex (or will console.warn)', () => {
    let ruleSet, list;

    // should warn
    global.console = {warn: jest.fn()}
    ruleSet = createRuleSet()
    ruleSet.add({
      target: 'ACTION_1',
      consequence: () => undefined
    })
    ruleSet.add({
      target: 'ACTION_2',
      consequence: () => undefined
    })
    list = inspect(ruleSet)
    expect(list.length).toBe(2)
    expect(console.warn.mock.calls.length).toBe(1)

    // should not warn
    global.console = {warn: jest.fn()}
    ruleSet = createRuleSet()
    ruleSet.add({
      target: 'ACTION',
      zIndex: 0,
      consequence: () => undefined
    })
    ruleSet.add({
      target: 'ACTION',
      zIndex: 1,
      consequence: () => undefined
    })
    list = inspect(ruleSet)
    expect(list.length).toBe(2)
    expect(console.warn.mock.calls.length).toBe(0)
  })

  test('multiple rules should be inserted ordered by their zIndex', () => {
    const createRule = zIndex => ({
      target: 'ACTION',
      zIndex,
      consequence: () => undefined
    })
    const rule1 = createRule(3)
    const rule2 = createRule(0)
    const rule3 = createRule(1)
    const rule4 = createRule(2)

    const ruleSet = createRuleSet()
    ruleSet.add(rule1)
    ruleSet.add(rule2)
    ruleSet.add(rule3)
    ruleSet.add(rule4)
    const list = inspect(ruleSet)
    expect(list[0]).toBe(rule2)
    expect(list[1]).toBe(rule3)
    expect(list[2]).toBe(rule4)
    expect(list[3]).toBe(rule1)
  })

  test('rules can be removed', () => {
    const createRule = zIndex => ({
      target: 'ACTION',
      zIndex,
      consequence: () => undefined
    })
    const rule1 = createRule(3)
    const rule2 = createRule(0)
    const rule3 = createRule(1)
    const rule4 = createRule(2)

    const ruleSet = createRuleSet()
    ruleSet.add(rule1)
    ruleSet.add(rule2)
    ruleSet.add(rule3)
    ruleSet.add(rule4)
    expect(inspect(ruleSet).length).toBe(4)
    ruleSet.remove(rule2)
    expect(inspect(ruleSet).length).toBe(3)
    expect(inspect(ruleSet).find(r => r === rule2)).toBe(undefined)
  })
})

describe('keyedRuleSet', () => {
  function inspect(key, ruleSet){
    const list = []
    ruleSet.forEach(key, rule => list.push(rule))
    return list
  }
  test('add 1 rule', () => {
    const ruleSet = createKeyedRuleSet()
    ruleSet.add({
      target: 'ACTION',
      consequence: () => undefined
    })
    const list = inspect('ACTION', ruleSet)
    expect(list.length).toBe(1)
  })

  test('multiple rules require a zIndex (or will console.warn)', () => {
    let ruleSet, list;

    // should warn
    global.console = {warn: jest.fn()}
    ruleSet = createKeyedRuleSet()
    ruleSet.add({
      target: 'ACTION',
      consequence: () => undefined
    })
    ruleSet.add({
      target: 'ACTION',
      consequence: () => undefined
    })
    expect(console.warn.mock.calls.length).toBe(1)

    // should not warn (has zIndex)
    global.console = {warn: jest.fn()}
    ruleSet = createKeyedRuleSet()
    ruleSet.add({
      target: 'ACTION',
      zIndex: 0,
      consequence: () => undefined
    })
    ruleSet.add({
      target: 'ACTION',
      zIndex: 1,
      consequence: () => undefined
    })
    expect(console.warn.mock.calls.length).toBe(0)

    // should not warn (different keys)
    global.console = {warn: jest.fn()}
    ruleSet = createKeyedRuleSet()
    ruleSet.add({
      target: 'ACTION_1',
      consequence: () => undefined
    })
    ruleSet.add({
      target: 'ACTION_2',
      consequence: () => undefined
    })
    expect(console.warn.mock.calls.length).toBe(0)
  })

  test('rules can be removed', () => {
    const createRule = zIndex => ({
      target: 'ACTION',
      zIndex,
      consequence: () => undefined
    })
    const rule1 = createRule(3)
    const rule2 = createRule(0)
    const rule3 = createRule(1)
    const rule4 = createRule(2)

    const ruleSet = createKeyedRuleSet()
    ruleSet.add(rule1)
    ruleSet.add(rule2)
    ruleSet.add(rule3)
    ruleSet.add(rule4)
    expect(inspect('ACTION', ruleSet).length).toBe(4)
    ruleSet.remove(rule2)
    expect(inspect('ACTION', ruleSet).length).toBe(3)
    expect(inspect('ACTION', ruleSet).find(r => r === rule2)).toBe(undefined)
  })
})