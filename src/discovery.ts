import { generateEvents } from 'gherkin';
import { readFile } from 'mz/fs';
import { TestSuiteInfo } from 'vscode-test-adapter-api';
import path from 'path';

const sendMessage = process.send ? (message: any) => process.send!(message) : () => {};

const featureDefaultLanguage = process.argv[2];
const logEnabled = process.argv[3] == 'true';
const featurePaths = process.argv.slice(3);

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

        if (event.type === 'pickle') {

            const test : TestSuiteInfo = {
                id: event.pickle.title,
                type: 'suite',
                label: event.pickle.title,
                children: []
            };

            sendMessage(test);
        }
        else if (event.type === 'attachment'){
            throw new Error(`Parse error in '${uri}': ${event.data}`);
        }

    });
}