const MakeIterator = getMapKeys => getNext => {
  const Iterator = () => {
    let idx = 0

    return {
      [Symbol.iterator]: Iterator,
      next: () => {
        const names = getMapKeys()
        if (idx < names.length) {
          const name = names[idx]
          ++idx
          return { done: false, value: getNext(name) }
        } else {
          return { done: true }
        }
      }
    }
  }

  return Iterator
}

export default MakeIterator
