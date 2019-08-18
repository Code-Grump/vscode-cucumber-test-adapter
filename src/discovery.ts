import { generateEvents, Scenario, ScenarioOutline, Examples } from 'gherkin';
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

function mapScenario(parentId: string, file: string, scenario: Scenario | ScenarioOutline) : TestSuiteInfo | TestInfo {

    const id = parentId + '#' + scenario.name;

    var result: any = {
        id: id,
        label: scenario.name,
        file: file,
        line: scenario.location.line - 1
    };

    if (scenario.type === 'Scenario') {
        result.type = 'test';
    }
    else if (scenario.type === 'ScenarioOutline') {
        result.type = 'suite';
        result.children = [];

        scenario.examples
            .map(examples => mapExamples(id, file, examples))
            .forEach(tests => tests.forEach(test => result.children.push(test)));
    }

    return result;
}

function mapExamples(parentId: string, file: string, examples: Examples) : TestInfo[] {
    
    let result: TestInfo[] = [];

    for (let k = 0; k < examples.tableBody.length; k++) {
        const row = examples.tableBody[k];
        let args: any = {};
        for (let i = 0; i < examples.tableHeader.cells.length; i++) {

            const cell = row.cells[i];
            if (cell === undefined) {
                break;
            }

            args[examples.tableHeader.cells[i].value] = cell.value;
        }

        const label = JSON.stringify(args);

        result.push({
            id: parentId + label,
            type: 'test',
            label,
            file,
            line: row.location.line - 1
        });
    }

    return result;
}