interface RuntimeOptions {
    dryRun: boolean;
    failFast: boolean;
    filterStacktraces: boolean;
    strict: boolean;
    worldParameters: string[];
};

interface StepDefinition {
    code,
    line,
    options,
    pattern,
    uri
}

declare module 'cucumber' {

    import { EventEmitter } from 'events';

    export function getTestCasesFromFilesystem(options: {
        cwd: string,
        eventBroadcaster: EventEmitter,
        featureDefaultLanguage: string,
        featurePaths: string[],
        order: string | undefined,
        pickleFilter: PickleFilter,
    })

    export interface SupportCodeLibrary {
        afterTestCaseHookDefinitions: StepDefinition[],
        afterTestRunHookDefinitions: StepDefinition[],
        beforeTestCaseHookDefinitions: StepDefinition[],
        beforeTestRunHookDefinitions: StepDefinition[],
        defaultTimeout: number,
        definitionFunctionWrapper: (code, options) => any,
        stepDefinitions: StepDefinition[],
        parameterTypeRegistry: object,
        World: object
    }

    export class PickleFilter {
        
        constructor(options: {
            featurePaths: string[] | undefined,
            names: string[] | undefined,
            tagExpression: string | undefined
        });
    }

    export class Runtime {
        constructor(options: {
            eventBroadcaster: EventEmitter,
            options: RuntimeOptions,
            supportCodeLibrary: SupportCodeLibrary,
            testCases: string[]
        })
        
        start(): Promise<void>;
    }

    export const supportCodeLibraryBuilder = {
        finalize(): SupportCodeLibrary;,
        reset(cwd): void;
    };
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
        order: string | undefined;
        parallel: number | undefined;
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

declare module 'cucumber/lib/runtime/parallel/master' {

    import { EventEmitter } from 'events';

    export default class ParallelRuntimeMaster {
        constructor(options: {
            eventBroadcaster: EventEmitter,
            options: RuntimeOptions,
            supportCodePaths: string[],
            supportCodeRequiredModules: string[],
            testCases: string[],
        })

        run(numberOfSlaves: number, done: (success: boolean) => void): void;
    }
}