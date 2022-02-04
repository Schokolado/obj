const rLine = /[^\s][^\n\r]+/g
const rXYZ =
  /^vn?\x20+(-?\d+\.\d{1,6})\x20+(-?\d+\.\d{1,6})\x20+(-?\d+\.\d{1,6})\x20*$/

const rUV = /^vt\x20+(-?\d+\.\d{1,6})\x20+(-?\d+\.\d{1,6})\x20*$/
const rSoft = /^s\x20+(off|1)\x20*$/

const iIndex = '((\\d+)\\/(\\d+)?(?:\\/(\\d+))?)'

// prettier-ignore
const rFace = new RegExp(
  '^f\\x20+' + iIndex + '\\x20+' + iIndex + '\\x20+' + iIndex + '(?:\\x20+' + iIndex + ')?\\x20*$'
)

export default function parse(str, opt = {}) {
  const { name = 'obj', showTime = true } = opt

  showTime && console.time(`[parse:${name}]`)

  let matches
  let res

  const keyMap = Object.create(null)
  const vertexMap = Object.create(null)
  const uvMap = Object.create(null)
  const normalMap = Object.create(null)

  let vNum = 0
  let uvNum = 0
  let normalNum = 0
  let num = 0

  let vertices = []
  let uvs = []
  let normals = []
  let indices = []
  let smoothData = []
  let faceIndex = 0

  let lastCmd = ''
  // let isNewObj = false

  const ret = []

  while ((matches = rLine.exec(str))) {
    const line = matches[0]
    const head = line.substring(0, 2)

    switch (head) {
      case 'v ':
        if ((res = line.match(rXYZ))) {
          const [_, x, y, z] = res
          vertexMap[++vNum] = [+x, +y, +z]
        } else {
          throwError(line)
        }

        if (lastCmd === 'f') {
          ret.push({
            vertices: new Float32Array(vertices),
            uvs: new Float32Array(uvs),
            normals: new Float32Array(normals),
            indices: getIndicesArray(indices),
            smoothData,
          })

          num = 0
          vertices = []
          uvs = []
          normals = []
          indices = []
          smoothData = []
          faceIndex = 0
        }

        lastCmd = 'v'
        break
      case 'vn':
        if ((res = line.match(rXYZ))) {
          const [_, x, y, z] = res
          normalMap[++normalNum] = [+x, +y, +z]
        } else {
          throwError(line)
        }

        break
      case 'vt':
        if ((res = line.match(rUV))) {
          const [_, u, v] = res
          uvMap[++uvNum] = [+u, +v]
        } else {
          throwError(line)
        }

        break
      case 'f ':
        // prettier-ignore
        if ((res = line.match(rFace))) {
          const [
            _,
            key, v, vt, vn,
            key2, v2, vt2, vn2,
            key3, v3, vt3, vn3,
            key4, v4, vt4, vn4,
          ] = res

          let a = keyMap[key]
          if (a == null) {
            vertices.push(...vertexMap[v])
            uvNum && uvs.push(...uvMap[vt])
            normalNum && normals.push(...normalMap[vn])

            a = keyMap[key] = num++
          }

          let b = keyMap[key2]
          if (b == null) {
            vertices.push(...vertexMap[v2])
            uvNum && uvs.push(...uvMap[vt2])
            normalNum && normals.push(...normalMap[vn2])

            b = keyMap[key2] = num++
          }

          let c = keyMap[key3]
          if (c == null) {
            vertices.push(...vertexMap[v3])
            uvNum && uvs.push(...uvMap[vt3])
            normalNum && normals.push(...normalMap[vn3])

            c = keyMap[key3] = num++
          }

          indices.push(a, b, c)
          faceIndex++

          if (key4) {
            let d = keyMap[key4]
            if (d == null) {
              vertices.push(...vertexMap[v4])
              uvNum && uvs.push(...uvMap[vt4])
              normalNum && normals.push(...normalMap[vn4])

              d = keyMap[key4] = num++
            }

            indices.push(a, c, d)
            faceIndex++
          }

          lastCmd = 'f'
        } else {
          throwError(line, ' Please make sure the face has only 3 or 4 edges!')
        }

        break
      case 's ':
        if ((res = line.match(rSoft))) {
          const [_, v] = res
          smoothData.push({
            faceIndex,
            smooth: v !== 'off',
          })
        }
        continue

      // case 'g ':
      //   isNewObj = true
      //   continue
    }
  }

  showTime && console.timeEnd(`[parse:${name}]`)

  ret.push({
    vertices: new Float32Array(vertices),
    uvs: new Float32Array(uvs),
    normals: new Float32Array(normals),
    indices: getIndicesArray(indices),
    smoothData,
  })

  return ret
}

function getIndicesArray(indices) {
  let m = 0
  let n

  let i = indices.length
  while (i--) {
    n = indices[i]
    n > m && (m = n)
  }

  switch (Math.log2(Math.log2(m)) | 0) {
    case 3:
      return new Uint16Array(indices)
    case 4:
      return new Uint32Array(indices)
    default:
      return new Uint8Array(indices)
  }
}

function throwError(line, msg = '') {
  throw new Error(`The line "${line}" is parsed with an error.${msg}`)
}
