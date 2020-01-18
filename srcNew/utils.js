// @flow

export function removeItem <Item:*>(list:Item[], item:Item) {
  let i, j

  for (i = 0, j = 0; i < list.length; ++i) {
    if (item !== list[i]) {
      list[j] = list[i]
      j++
    }
  }

  if(j < i) list.pop()
}