import * as utils from './utils'

// dependencies

let ruleDB 
let ruleContext

const initTest = () => {
  jest.resetModules()
  ruleDB = require('../ruleDB')
  ruleContext = utils.createContext()
}

describe.only('addRule', () => {
  beforeEach(initTest)

  test('sets context to active', () => {
    ruleContext.active = false
    ruleDB.addRule(ruleContext)
    expect(ruleContext.active).toBe(true)
  })

  test('adds ruleContext by correct position', () => {
    const ruleContext = utils.createContext({target:'MY_TYPE', position: 'BEFORE'})
    ruleDB.addRule(ruleContext)
    expect(ruleDB.testing.activeRules['BEFORE']['MY_TYPE'][0]).toBe(ruleContext)
  })

  test('adds ruleContext for each rule-target', () => {
    // string target
    const ruleContextString = utils.createContext({target:'MY_STRING_TYPE'})
    ruleDB.addRule(ruleContextString)
    expect(ruleDB.testing.activeRules['AFTER']['MY_STRING_TYPE'][0]).toBe(ruleContextString)

    // array target
    const ruleContextArray = utils.createContext({target: ['MY_ARRAY_1_TYPE', 'MY_ARRAY_2_TYPE']})
    ruleDB.addRule(ruleContextArray)
    expect(ruleDB.testing.activeRules['AFTER']['MY_ARRAY_1_TYPE'][0]).toBe(ruleContextArray)
    expect(ruleDB.testing.activeRules['AFTER']['MY_ARRAY_2_TYPE'][0]).toBe(ruleContextArray)
    // glob target
    const ruleContextGlob = utils.createContext({target: '*'})
    ruleDB.addRule(ruleContextGlob)
    expect(ruleDB.testing.activeRules['AFTER']['-global-'][0]).toBe(ruleContextGlob)
  })


  test('triggers ADD_RULE context event', () => {
    ruleDB.addRule(ruleContext)
    expect(ruleContext.events.trigger).toBeCalledWith('ADD_RULE')
  })

  test('adds context by rule weight', () => {
    const ruleContext1 = utils.createContext({weight:1, id:'RULE_1'})
    const ruleContext2 = utils.createContext({weight:2, id:'RULE_2'})
    const ruleContext3 = utils.createContext({weight:3, id:'RULE_3'})
    ruleDB.addRule(ruleContext1)
    ruleDB.addRule(ruleContext3)
    ruleDB.addRule(ruleContext2)
    expect(ruleDB.testing.activeRules['AFTER']['TEST_TYPE'][0]).toBe(ruleContext1)
    expect(ruleDB.testing.activeRules['AFTER']['TEST_TYPE'][1]).toBe(ruleContext2)
    expect(ruleDB.testing.activeRules['AFTER']['TEST_TYPE'][2]).toBe(ruleContext3)
  })
})