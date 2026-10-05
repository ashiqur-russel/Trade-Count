/** `.wasm` imports resolve to the hashed file URL (angular.json `loader: { ".wasm": "file" }`). */
declare module '*.wasm' {
  const url: string;
  export default url;
}
