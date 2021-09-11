export const add = (xy1, xy2) => [xy1[0] + xy2[0], xy1[1] + xy2[1]]
export const scale = (xy, s) => [xy[0] * s, xy[1] * s]

export default {
  add,
  scale,
}
