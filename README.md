collect-mutations
---
A pull-stream sink for mutation streams coming from [ssb-review-level](https://www.npmjs.com/package/ssb-review-level)

If you want to display a set of ssb messages and want them to update in realtime, this is your friend.

``` js
const collectMutations = require('collect-mutations')
const MutantArray = require('mutant/array')
const mmap = require('mutant/map')

const messages = MutantArray()

pull(
  ssb.revisions.messagesByType('post'),
  collectMutations(messages, err  => console.error(err))
)

document.body.appendChild(
  h('ul', mmap(messages, kv => h('li', kv.value.content.text)))
)
```

See Also:

- [ssb-revisions](https://www.npmjs.com/package/ssb-revisions)
- [mutant](https://www.npmjs.com/package/mutant)
- [tre-watch-heads](https://www.npmjs.com/package/tre-watch-heads)

License: ISC
