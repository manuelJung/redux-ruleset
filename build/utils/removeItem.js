"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = removeItem;
function removeItem(list, item) {
  var i = void 0,
      j = void 0;

  for (i = 0, j = 0; i < list.length; ++i) {
    if (item !== list[i]) {
      list[j] = list[i];
      j++;
    }
  }

  if (j < i) list.pop();
}