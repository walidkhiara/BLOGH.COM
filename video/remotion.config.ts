import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// This container has no outbound access to Remotion's Chrome download host,
// but ships a Playwright Chromium. Use that instead of fetching one.
const LOCAL_CHROME = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
Config.setBrowserExecutable(LOCAL_CHROME);
