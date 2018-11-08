const pull = require('pull-stream')
const multicb = require('multicb')
const {test, msg, rndKey} = require('ssb-revisions/test/test-helper')
const MutantArray = require('mutant/array')
const collectMutations = require('../')

function append(db, msgs, cb) {
  pull(
    pull.values(msgs),
    pull.asyncMap( (m, cb) => {
      db.append(m, cb)
    }),
    pull.asyncMap( (x, cb) => {
      setTimeout( ()=>cb(null, x), 100)
    }),
    pull.collect( (err, seqs)=>{
      if (err) {
        console.error('append failed')
        throw err
      }
      cb(seqs)
    })
  )
}

test('sync: false', (t, db) => {
  const keyA = rndKey()
  const keyB = rndKey()
  const a = msg(keyA)
  const b = msg(keyB)

  a.value.content.type = 'cat'
  b.value.content.type = 'cat'

  append(db, [a, b], seqs => {

    const cats = MutantArray()

    pull(
      db.revisions.messagesByType('cat'),
      collectMutations(cats, err  => {
        if (err) throw err
        t.deepEqual(cats.getLength(), 2)
        t.ok(cats().map(kv=>kv.key).includes(a.key))
        t.ok(cats().map(kv=>kv.key).includes(b.key))
        t.end()
      })
    )
  })
})

test('morphing', (t, db) => {
  const keyA = rndKey()
  const keyA1 = rndKey()
  const keyA2 = rndKey()
  const keyB = rndKey()
  const a = msg(keyA)
  const b = msg(keyB)
  const a1 = msg(keyA1, keyA, [keyA])
  const a2 = msg(keyA2, keyA, [keyA1])

  a.value.content.type = 'dog'
  a1.value.content.type = 'dog'
  a2.value.content.type = 'cat'
  b.value.content.type = 'cat'

  const done = multicb({pluck: 1})
  const cb1 = done()
  const cb2 = done()

  const cats = MutantArray()
  const dogs = MutantArray()

  cats( v => {
    console.log('cats', v)
  })

  dogs( v => {
    console.log('dogs', v)
  })

  append(db, [a], seqs => {

    pull(
      db.revisions.messagesByType('cat', {live: true, sync: true}),
      pull.take(3), // sync plus 2
      collectMutations( cats, {sync: true}, err  => {
        console.log('got cats')
        if (err && err !== true) return cb1(err)
        t.deepEqual(cats.getLength(), 2)
        t.deepEqual(cats.get(0)(), a2)
        t.deepEqual(cats.get(1)(), b)
        cb1()
      })
    )

    pull(
      db.revisions.messagesByType('dog', {live: true, sync: true}),
      pull.take(3), // sync plus 3
      collectMutations( dogs, {sync: true}, err  => {
        console.log('got dogs')
        console.log('err', err)
        if (err && err !== true) return cb2(err)
        t.deepEqual(dogs.getLength(), 0)
        cb2()
      })
    )
  })

  append(db, [a1, a2, b], ()=>{})

  done( err =>{
    if (err) console.log(err)
    console.log('done')
    t.end()
  })
})


