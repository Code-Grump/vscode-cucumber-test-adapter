import { ChildProcess, fork } from 'child_process';
import * as vscode from 'vscode';
import { TestAdapter, TestLoadStartedEvent, TestLoadFinishedEvent, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent, TestSuiteInfo } from 'vscode-test-adapter-api';
import { Log } from 'vscode-test-adapter-util';
import stream = require('stream');
import { Configuration, ConfigurationLoader } from './configuration';

/**
 * A test adapter for Cucumber.js authored features.
 */
export class CucumberAdapter implements TestAdapter {

	private disposables: { dispose(): void }[] = [];

	private runnerProcess: ChildProcess | undefined;

	private readonly configurationLoader: ConfigurationLoader;

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

		this.configurationLoader = new ConfigurationLoader(this.workspace, this.log);
	}

	async load(): Promise<void> {

		this.testsEmitter.fire(<TestLoadStartedEvent>{ type: 'started' });

		var config = await this.configurationLoader.load();

		if (this.log.enabled) {
			this.log.info(`Loading Cucumber.js tests of ${this.workspace.uri.fsPath}`);
		}

		const rootSuite: TestSuiteInfo = {
			type: 'suite',
			id: 'root',
			label: 'Cucumber.js',
			children: []
		}

		try {

			var features = await this.discoverFeatures(config);

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

	private async discoverFeatures(configuration: Configuration) : Promise<TestSuiteInfo[] | undefined> {
		return new Promise<TestSuiteInfo[] | undefined>(resolve => {

			const features: TestSuiteInfo[] = [];

			const discovery = require.resolve('./discovery.js');
			const discoveryArgs = [
				configuration.featureDefaultLanguage,
				JSON.stringify(this.log.enabled)
			].concat(configuration.featurePaths);
			
			const discoveryProcess = fork(
				discovery,
				discoveryArgs,
				{
					cwd: configuration.cwd,
					env: configuration.env,
					execPath: configuration.nodePath,
					execArgv: configuration.nodeArgv,
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

	async run(tests: string[], execArgv: string[] = []): Promise<void> {

		this.log.info(`Running Cucumber.js tests ${JSON.stringify(tests)} of ${this.workspace.uri.fsPath}`);

		this.testStatesEmitter.fire(<TestRunStartedEvent>{ type: 'started', tests });
		
		var configuration = await this.configurationLoader.load();

		try {
			await this.runTests(tests, configuration, execArgv);
		}
		finally {
			this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: 'finished' });
		}
	}

	/**
	 * Runs the specified tests using the specified configuration.
	 * 
	 * @param tests The tests to run.
	 * @param configuration The test configuration to use to run the tests.
	 * @param execArgv Additional arguments to pass to node.
	 */
	private async runTests(tests: string[], configuration: Configuration, execArgv: string[]): Promise<void> {

		const runner = require.resolve('./runner.js');
		const runArgs = [
			JSON.stringify(configuration),
			JSON.stringify(this.log.enabled)
		].concat(tests);
		
		this.runnerProcess = fork(
			runner,
			runArgs,
			{
				cwd: configuration.cwd,
				env: configuration.env,
				execPath: configuration.nodePath,
				execArgv: configuration.nodeArgv,
				stdio: ['pipe', 'pipe', 'pipe', 'ipc']
			});

		this.pipeProcess(this.runnerProcess);

		this.runnerProcess.on('message', (message: string | TestSuiteInfo) => {
		});
	}

/*	implement this method if your TestAdapter supports debugging tests
	async debug(tests: string[]): Promise<void> {
		// start a test run in a child process and attach the debugger to it...
	}
*/

	cancel(): void {
		if (this.runnerProcess){
			this.runnerProcess.kill();
		}
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