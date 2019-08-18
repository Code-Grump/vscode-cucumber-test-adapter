import { generateEvents, Scenario } from 'gherkin';
import { readFile } from 'mz/fs';
import { TestSuiteInfo, TestInfo } from 'vscode-test-adapter-api';
import path from 'path';

const sendMessage = process.send ? (message: any) => process.send!(message) : () => {};

const featureDefaultLanguage = process.argv[2];
const logEnabled = process.argv[3] == 'true';
const featurePaths = process.argv.slice(4);

/**
 * Performs the discovery of Cucumber feature files.
 */
(async () => {
    
    let searchPromises: Promise<void>[] = [];

    featurePaths.forEach(featurePath => searchPromises.push(readScenarios(featurePath, featureDefaultLanguage)));

    await Promise.all(searchPromises);

})().catch(err => {
    if (logEnabled) {
        sendMessage(`Error during feature discovery: ${err}`);
    }

    process.exitCode = -1;
});

async function readScenarios(featurePath: string, language: string): Promise<void> {

    const uri = path.relative(process.cwd(), featurePath);

    const source = await readFile(featurePath, 'utf8');

    const events = generateEvents(source, uri, {}, language);

    events.forEach(event => {

        if (event.type === 'gherkin-document') {
            const document = event.document;
            const feature = document.feature;

            const suite : TestSuiteInfo = {
                id: uri,
                type: 'suite',
                label: feature.name,
                file: featurePath,
                line: feature.location.line - 1,
                children: feature.children.map(scenario => mapScenario(uri, featurePath, scenario))
            };

            sendMessage(suite);
        }
        else if (event.type === 'attachment'){
            throw new Error(`Parse error in '${uri}': ${event.data}`);
        }

    });
}

function mapScenario(parentId: string, file: string, scenario: Scenario) : TestSuiteInfo | TestInfo {

    return {
        id: parentId + '#' + scenario.name,
        type: 'test',
        label: scenario.name,
        file: file,
        line: scenario.location.line - 1
    };
}