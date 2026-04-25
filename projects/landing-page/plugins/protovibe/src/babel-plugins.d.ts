// Type stubs for babel syntax plugins which ship no declaration files.
declare module '@babel/plugin-syntax-jsx' {
  import type { PluginObj } from '@babel/core';
  function plugin(...args: unknown[]): PluginObj;
  export default plugin;
}

declare module '@babel/plugin-syntax-typescript' {
  import type { PluginObj } from '@babel/core';
  interface Options {
    isTSX?: boolean;
    allExtensions?: boolean;
    disallowAmbiguousJSXLike?: boolean;
  }
  function plugin(...args: unknown[]): PluginObj;
  export default plugin;
}
