const pull = require('pull-stream')
const Value = require('mutant/value')

// we expect the strem to emit
// {key: [..., revisionRoot], type: 'del'}
// and/or
// {key: [..., revisionRoot], value: { key:, value: } }
  
module.exports = function(mutantArray, opts, cb) {
  if (typeof opts == 'function') {
    cb = opts
    opts = {}
  }
  opts = opts || {}
  let synced = opts.sync !== true
  let buffer = []

  function matchesRevRoot(revRoot) {
    return function(kv) { 
      if (kv.key == revRoot) return true
      return kv.value.content && kv.value.content.revisionRoot == revRoot
    }
  }

  function find(revRoot) {
    const f = matchesRevRoot(revRoot)
    if (!synced) return buffer.find(f)
    return mutantArray.find( obv => f(obv()) )
  }

  function remove(revRoot) {
    if (synced) return mutantArray.delete(find(revRoot))
    const f = matchesRevRoot(revRoot)
    buffer = buffer.filter( x => !f(x) )
  }

  function setOrAdd(revRoot, kv) {
    const entry = find(revRoot)
    if (entry) {
      console.log('set', !synced ? 'buffered' : 'onservable', kv)
      if (synced) return entry.set(kv)
      return Object.assign(entry, kv)
    }
    console.log('add', !synced ? 'buffered' : 'onservable', kv)
    if (synced) return mutantArray.push(Value(kv))
    buffer.push(Object.assign({}, kv))
  }
  
  function process(kvv) {
    if (kvv.sync) {
      if (!synced) {
        mutantArray.set(buffer.map( e => Value(e) ))
        buffer = null
        synced = true
        console.log('collect-mutations sync')
      }
      return
    }
    const revRoot = getRevRoot(kvv.key)
    console.log('got revRoot', revRoot)
    if (kvv.type == 'del') {
      console.log('del')
      remove(revRoot)
    } else {
      setOrAdd(revRoot, kvv.value)
    }
  }

  return pull.drain(process, cb)
}

function getRevRoot(indexKey) {
  return indexKey[indexKey.length - 1]
}
