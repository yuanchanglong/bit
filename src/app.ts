import 'reflect-metadata';
import * as BPromise from 'bluebird';
import { Harmony } from './harmony';
import HooksManager from './hooks';
import { BitCliExt } from './cli';
import { ComposerExt } from './extensions/composer';
import defaultHandleError from './cli/default-error-handler';
import { logErrAndExit } from './cli/command-registry';
import { BuildExt } from './extensions/build';

process.env.MEMFS_DONT_WARN = 'true'; // suppress fs experimental warnings from memfs

// removing this, default to longStackTraces also when env is `development`, which impacts the
// performance dramatically. (see http://bluebirdjs.com/docs/api/promise.longstacktraces.html)
BPromise.config({
  longStackTraces: true
});

// loudRejection();
HooksManager.init();

const config = {
  workspace: {
    components: '*'
  }
};

Harmony.run(BitCliExt, config)
  .then(harmony => {
    const cli = harmony.get('BitCli');
    // @ts-ignore
    if (cli && cli.instance) return cli.instance.run([], harmony);
    throw new Error('failed to load CLI');
  })
  .catch(err => {
    // console.log(err);
    const handledError = defaultHandleError(err.originalError);
    logErrAndExit(handledError || err, process.argv[1] || '');
  });
