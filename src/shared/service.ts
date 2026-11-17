// The one place that says which streaming service this app is for. The rest
// of the code is service-neutral; to point the layer at another service,
// change this file, `src/main/hosts.ts`, the adapter and the notice in
// `src/shared/about.ts`.

/** The app's own name, shown in the window title, the About panel and notice pages. */
export const APP_NAME = 'Sapling TV';

/** Prefix for lines the app writes to the terminal. */
export const LOG_PREFIX = '[sapling-tv]';

/** Where the window starts: the service's normal website. */
export const HOME_URL = 'https://tv.apple.com/';

/** The site adapter file in `adapters/`. Selectors there need evidence (Hard rule 7). */
export const ADAPTER_FILE = 'appletv.json';
