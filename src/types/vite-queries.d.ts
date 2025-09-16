/// <reference types="vite/client" />

declare module '*?url' {
  const url: string
  export default url
}

declare module '*?worker' {
  const worker: new () => Worker
  export default worker
}

declare module '*?worker&url' {
  const url: string
  export default url
}