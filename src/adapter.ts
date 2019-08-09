import { ChildProcess, fork } from 'child_process';
import * as vscode from 'vscode';
import { TestAdapter, TestLoadStartedEvent, TestLoadFinishedEvent, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent, TestSuiteInfo } from 'vscode-test-adapter-api';
import { Log } from 'vscode-test-adapter-util';
import { runFakeTests } from './fakeTests';
import stream = require('stream');


/**
 * A test adapater for Cucumber.js authored features.
 */
export class CucumberAdapter implements TestAdapter {

	private disposables: { dispose(): void }[] = [];

	private readonly testsEmitter = new vscode.EventEmitter<TestLoadStartedEvent | TestLoadFinishedEvent>();
	private readonly testStatesEmitter = new vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>();
	private readonly autorunEmitter = new vscode.EventEmitter<void>();

	get tests(): vscode.Event<TestLoadStartedEvent | TestLoadFinishedEvent> { return this.testsEmitter.event; }
	get testStates(): vscode.Event<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent> { return this.testStatesEmitter.event; }
	get autorun(): vscode.Event<void> | undefined { return this.autorunEmitter.event; }

	constructor(
		public readonly workspace: vscode.WorkspaceFolder,
		public readonly channel: vscode.OutputChannel,
		private readonly log: Log) {

		this.log.info('Initializing Cucumber.js adapter');

		this.disposables.push(this.testsEmitter);
		this.disposables.push(this.testStatesEmitter);
		this.disposables.push(this.autorunEmitter);

	}

	async load(): Promise<void> {

		this.log.info('Loading Cucumber.js tests');

		this.testsEmitter.fire(<TestLoadStartedEvent>{ type: 'started' });

		const rootSuite: TestSuiteInfo = {
			type: 'suite',
			id: 'root',
			label: 'Cucumber.js',
			children: []
		}

		try {

			var features = await this.discoverFeatures();

			// TODO: Sort the features and scenarios (alphabetically?)
			if (features) {
				Object.assign(rootSuite.children, features);
			}
		}
		finally {

			this.testsEmitter.fire(<TestLoadFinishedEvent>{ 
				type: 'finished',
				suite: rootSuite.children.length > 0 ? rootSuite : undefined });
		}
	}

	private async discoverFeatures() : Promise<TestSuiteInfo[] | undefined> {
		return new Promise<TestSuiteInfo[] | undefined>(resolve => {

			const features: TestSuiteInfo[] = [];

			const discovery = require.resolve('./discovery.js');
			const discoveryArgs = [this.workspace.uri.toString()];
			const discoveryProcess = fork(
				discovery,
				discoveryArgs,
				{
					/*cwd: this.workspace.uri.toString(),
					env: config.env,
					execPath: config.nodePath,
					execArgv: config.nodeArgv,*/
					stdio: ['pipe', 'pipe', 'pipe', 'ipc']
				});

			this.pipeProcess(discoveryProcess);

			discoveryProcess.on('message', (message: string | TestSuiteInfo) => {

				if (typeof(message) === 'string') {
					this.log.info(`Worker: ${message}`);
				}
				else {

					var feature = message;

					if (this.log.enabled) {
						this.log.info(`Received scenarios for feature ${feature.file} from worker`);
					}

					features.push(feature);
				}
			});

			discoveryProcess.on('exit', (code) => {
				this.log.info(`Worker process exited with code ${code}`);
				resolve(features);
			});
		});
	}

	async run(tests: string[]): Promise<void> {

		this.log.info(`Running Cucumber.js tests ${JSON.stringify(tests)}`);

		this.testStatesEmitter.fire(<TestRunStartedEvent>{ type: 'started', tests });

		// in a "real" TestAdapter this would start a test run in a child process
		await runFakeTests(tests, this.testStatesEmitter);

		this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: 'finished' });

	}

/*	implement this method if your TestAdapter supports debugging tests
	async debug(tests: string[]): Promise<void> {
		// start a test run in a child process and attach the debugger to it...
	}
*/

	cancel(): void {
		// in a "real" TestAdapter this would kill the child process for the current test run (if there is any)
		throw new Error("Method not implemented.");
	}

	dispose(): void {
		this.cancel();
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables = [];
	}

	/**
	 * Pipes the output of a process to the output of the current process.
	 * @param process The process to pipe through the current.
	 */
	private pipeProcess(process: ChildProcess) {

		const customStream = new stream.Writable();

		customStream._write = (data, encoding, callback) => {
			this.channel.append(data.toString());
			callback();
		};

		process.stderr!.pipe(customStream);
		process.stdout!.pipe(customStream);
	}
}
