// plugins/protovibe/index.ts
import { Plugin } from 'vite';
import { jsxLocatorPlugin } from './preprocessing/jsx-locator';
import { protovibeSourcePlugin } from './protovibe-source';
import { specsPublishPlugin } from './backend/specs-publish';
import { lofiPlugin } from './lofi/plugin';

export function protovibePlugin(): Plugin[] {
  return [
    jsxLocatorPlugin(),
    protovibeSourcePlugin(),
    specsPublishPlugin(),
    lofiPlugin(),
  ];
}

export { jsxLocatorPlugin, protovibeSourcePlugin, specsPublishPlugin };
