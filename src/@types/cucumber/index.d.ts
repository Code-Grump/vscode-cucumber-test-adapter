declare module 'cucumber/lib/cli/helpers';

import { EventEmitter } from 'events';

interface RuntimeOptions {
    dryRun: boolean;
    failFast: boolean;
    filterStacktraces: boolean;
    strict: boolean;
    worldParameters: string[];
};

declare module 'cucumber/lib/runtime' {

    export default class Runtime {
        constructor(options: {
            eventBroadcaster: EventEmitter,
            options: RuntimeOptions,
            supportCodeLibrary,
            testCases
        })
    }
}

declare module 'cucumber/lib/runtime/parallel/master' {

    export default class ParallelRuntimeMaster {
        constructor(options: {
            eventBroadcaster: EventEmitter,
            options: RuntimeOptions,
            supportCodePaths: string[],
            supportCodeRequiredModules: string[],
            testCases: string[],
        })
    }
}

declare module 'cucumber/lib/cli/configuration_builder' {
    export default class ConfigurationBuilder {

        static async build(options: { argv: string[], cwd: string }): Promise<Configuration>;

        constructor({ argv, cwd});

        async build(): Promise<Configuration>;
    }

    export interface Configuration {
        featureDefaultLanguage: string;
        featurePaths: string[];
        formats: string[];
        formatOptions: string[];
        listI18nKeywordsFor: string[];
        listI18nLanguages: string[];
        order: string;
        parallel: boolean;
        profiles: string;
        pickleFilterOptions: {
            featurePaths: string[] | undefined;
            names: string[] | undefined;
            tagExpression: string | undefined;
        };
        runtimeOptions: RuntimeOptions;
        shouldExitImmediately: boolean;
        supportCodePaths: string[];
        supportCodeRequiredModules: string[];
    }
}

declare module 'cucumber/lib/pickle_filter' {

    export default class PickleFilter {
        
        constructor(options: {
            featurePaths: string[] | undefined,
            names: string[] | undefined,
            tagExpression: string | undefined
        });
    }

}