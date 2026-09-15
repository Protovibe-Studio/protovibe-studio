// plugins/protovibe/index.ts
import { Plugin } from 'vite';
import { jsxLocatorPlugin } from './preprocessing/jsx-locator';
import { protovibeSourcePlugin } from './protovibe-source';
import { specsPublishPlugin } from './backend/specs-publish';

export function protovibePlugin(): Plugin[] {
  return [
    jsxLocatorPlugin(),
    protovibeSourcePlugin(),
    specsPublishPlugin(),
  ];
}

export { jsxLocatorPlugin, protovibeSourcePlugin, specsPublishPlugin };
