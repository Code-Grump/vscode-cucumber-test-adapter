import { EventEmitter } from 'events';
import { Configuration} from './configuration';
import { getTestCasesFromFilesystem, supportCodeLibraryBuilder, PickleFilter, Runtime } from 'cucumber';
import ParallelRuntimeMaster from 'cucumber/lib/runtime/parallel/master';

const sendMessage = process.send ? (message: any) => process.send!(message) : () => {};

const configuration = <Configuration>JSON.parse(process.argv[2]);
const logEnabled = process.argv[3] == 'true';

/**
 * Performs the execution of Cucumber scenarios.
 */
(async () => {

    const eventBroadcaster = new EventEmitter();

    configuration.supportCodeRequiredModules.map(module => require(module))
    supportCodeLibraryBuilder.reset(configuration.cwd);
    configuration.supportCodePaths.forEach(codePath => require(codePath))

    const supportCodeLibrary = supportCodeLibraryBuilder.finalize();

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

        const parallel = configuration.parallel;

        const parallelRuntimeMaster = new ParallelRuntimeMaster({
            eventBroadcaster,
            options: configuration.runtimeOptions,
            supportCodePaths: configuration.supportCodePaths,
            supportCodeRequiredModules: configuration.supportCodeRequiredModules,
            testCases,
        });

        await new Promise(resolve => {
            parallelRuntimeMaster.run(
                parallel, 
                s => {
                    success = s;
                    resolve();
            });
        });

    } else {

        const runtime = new Runtime({
            eventBroadcaster,
            options: configuration.runtimeOptions,
            supportCodeLibrary,
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