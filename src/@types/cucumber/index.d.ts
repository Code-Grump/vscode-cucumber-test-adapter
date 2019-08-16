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
            featurePaths: string[];
            names: string[];
            tagExpression: string[];
        };
        runtimeOptions: {
            dryRun: boolean;
            failFast: boolean;
            filterStacktraces: boolean;
            strict: boolean;
            worldParameters: string[];
        };
        shouldExitImmediately: boolean;
        supportCodePaths: string[];
        supportCodeRequiredModules: string[];
    }
}