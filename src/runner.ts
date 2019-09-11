import { EventEmitter } from 'events';
import { Configuration} from './configuration';
import { getTestCasesFromFilesystem } from 'cucumber/lib/cli/helpers';
import PickleFilter from 'cucumber/lib/pickle_filter';
import Runtime from 'cucumber/lib/runtime';
import ParallelRuntimeMaster from 'cucumber/lib/runtime/parallel/master';

const sendMessage = process.send ? (message: any) => process.send!(message) : () => {};

const configuration = <Configuration>JSON.parse(process.argv[2]);
const logEnabled = process.argv[3] == 'true';

/**
 * Performs the execution of Cucumber scenarios.
 */
(async () => {

    const eventBroadcaster = new EventEmitter();

    // TODO: Restore support for support code libraries.
    //const supportCodeLibrary = this.getSupportCodeLibrary(configuration);

    const testCases = await getTestCasesFromFilesystem({
        cwd: configuration.cwd,
        eventBroadcaster,
        featureDefaultLanguage: configuration.featureDefaultLanguage,
        featurePaths: configuration.featurePaths,
        order: configuration.order,
        pickleFilter: new PickleFilter(configuration.pickleFilterOptions),
    });

    let success;
    if (configuration.parallel) {
        const parallelRuntimeMaster = new ParallelRuntimeMaster({
            eventBroadcaster,
            options: configuration.runtimeOptions,
            supportCodePaths: configuration.supportCodePaths,
            supportCodeRequiredModules: configuration.supportCodeRequiredModules,
            testCases,
        });
        await new Promise(resolve => {
            parallelRuntimeMaster.run(configuration.parallel, s => {
            success = s;
            resolve();
            });
        });
    } else {
        const runtime = new Runtime({
            eventBroadcaster,
            options: configuration.runtimeOptions,
            //supportCodeLibrary,
            testCases,
        });
        success = await runtime.start();
    }

})().catch(err => {
    if (logEnabled) {
        sendMessage(`Error during feature discovery: ${err}`);
    }

    process.exitCode = -1;
});

/*	private getSupportCodeLibrary({ supportCodeRequiredModules, supportCodePaths }) {
		supportCodeRequiredModules.map(module => require(module))
		supportCodeLibraryBuilder.reset(this.cwd)
		supportCodePaths.forEach(codePath => require(codePath))
		return supportCodeLibraryBuilder.finalize()
	  }
*/