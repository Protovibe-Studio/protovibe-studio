// plugins/protovibe/index.ts
import { Plugin } from 'vite';
import { jsxLocatorPlugin } from './preprocessing/jsx-locator';
import { protovibeSourcePlugin } from './protovibe-source';

export function protovibePlugin(): Plugin[] {
  return [
    jsxLocatorPlugin(),
    protovibeSourcePlugin(),
  ];
}

export { jsxLocatorPlugin, protovibeSourcePlugin };
