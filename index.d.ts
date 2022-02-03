export interface IObj {
  vertices: Float32Array
  uvs?: Float32Array
  normals?: Float32Array
  indices?: Uint8Array | Uint16Array | Uint32Array
  soft?: boolean
}

export interface IOpt {
  name?: string
  showTime?: boolean
}

export default function parse(str: string, opt?: IOpt): IObj[]
