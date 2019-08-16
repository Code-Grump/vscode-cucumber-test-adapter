import { generateEvents } from 'gherkin';
import { readFile } from 'mz/fs';
import * as path from 'path';
import { TestSuiteInfo } from 'vscode-test-adapter-api';

/**
 * Performs the discovery of Cucumber feature files.
 */

const sendMessage = process.send ? (message: any) => process.send!(message) : () => {};

const workspace = process.argv[2];
const logEnabled = process.argv[3] == 'true';

new Promise(async resolve => {

    const featurePaths = [ 'scripts/test/features/**/*.feature' ];
    const featureDefaultLanguage = 'en-GB';
    
    let searchPromises: Promise<void>[] = [];

    featurePaths.forEach(featurePath => searchPromises.push(findFeatures(featurePath, featureDefaultLanguage)));

    await Promise.all(searchPromises);

    resolve();
})
.catch(err => {
    if (logEnabled) {
        sendMessage(`Error during feature discovery: ${err}`);
    }
    else {    
        throw err;
    }
});

function findFeatures(featurePath: string, language: string): Promise<void> {

    const uri = path.relative(workspace, featurePath);

    return new Promise(async resolve => {

        const source = await readFile(uri, 'utf8');

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

        resolve();
    });
}