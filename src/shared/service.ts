// The one place that says which streaming service this app is for. Everything
// else is Longboard (the browser underneath), plus the profile in `profiles/`
// and the notice in `about.ts`.

/** The app's own name: the window title and the About panel. */
export const APP_NAME = 'Sapling TV';

/** Prefix for lines this app's own start-up code writes to the terminal. Longboard's parts say "[longboard]". */
export const LOG_PREFIX = '[sapling-tv]';

/** Where the window starts: the service's normal website. */
export const HOME_URL = 'https://tv.apple.com/';
