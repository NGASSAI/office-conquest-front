/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import { NetworkOnly } from 'serwist';
import { Serwist } from 'serwist';
import type { PrecacheEntry } from 'serwist';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && pathname.startsWith('/api/'),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();