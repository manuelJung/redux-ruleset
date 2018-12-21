// // @flow
// import {createYielder} from '../yieldRule'
// import configureMockStore from 'redux-mock-store'

// declare var describe: any
// declare var test: any
// declare var expect: any
// declare var jest: any

// const mockStore = configureMockStore()

// test('it should handle an async workflow', async () => {
//   const cb = jest.fn()
//   const store = mockStore({})
//   const yielder = createYielder(store)
//   yielder.add(async next => {
//     await next(() => true)
//     await next()
//     console.log('2')
//     return 'RESOLVE'
//   }, cb)
//   yielder.yieldAction({type:'NEXT'})
//   expect(cb.mock.calls.length).toBe(0)
//   yielder.yieldAction({type:'NEXT'})
//   await cb()
//   expect(cb.mock.calls.length).toBe(1)
// })

