import * as vscode from 'vscode';
import * as path from 'path';
import { detectNodePath } from 'vscode-test-adapter-util';
import { Log } from 'vscode-test-adapter-util';
import ConfigurationBuilder from 'cucumber/lib/cli/configuration_builder';
import { Configuration as CucumberJsConfiguration } from 'cucumber/lib/cli/configuration_builder';

export interface Configuration extends CucumberJsConfiguration {
	cwd: string;
	profileName: string;
	env: { [prop: string]: any };
	nodePath: string | undefined;
  nodeArgv: string[];
}

export class ConfigurationLoader {

  constructor(
    public readonly workspace: vscode.WorkspaceFolder,
		private readonly log: Log) {
  }

  public async load() : Promise<Configuration> {
    const adapterConfig = vscode.workspace.getConfiguration('cucumberJsExplorer', this.workspace.uri);

    const cwd = path.resolve(this.workspace.uri.fsPath, adapterConfig.get<string>('cwd') || '');

    const profileName = adapterConfig.get<string>('profile') || 'default';

    const profileFilePath = path.resolve(cwd, 'cucumber.js');

    let profiles: any;
    try {
      profiles = require(profileFilePath);
    }
    catch (err) {
    }

    let args: string[] | undefined = undefined;

    if (profiles) {
      if (this.log.enabled) {
        this.log.debug(`Using profiles file: ${profileFilePath}`);
      }

      const cliArgs : string | undefined = profiles[profileName];

      if (cliArgs)
      {
        if (this.log.enabled) {
          this.log.debug(`Using profile: ${profileName}`);
        }

        args = cliArgs.split(' ');
      }
    }

    const config = await ConfigurationBuilder.build({ argv: args || [ 'node', 'cucumber-js' ], cwd });

    const configEnv: { [prop: string]: any } = adapterConfig.get('env') || {};
    if (this.log.enabled) {
      this.log.debug(`Using environment variable config: ${JSON.stringify(configEnv)}`);
    }

    // Override the current set of environment variables with any configured.
    const env = { ...process.env };
    for(const prop in configEnv) {
      const val = configEnv[prop];
      if ((val === undefined) || (val === null)) {
        delete env.prop;
      } else {
        env[prop] = String(val);
      }
    }

    // Resolve the path to node, if specified.
    let nodePath: string | undefined = adapterConfig.get<string>('nodePath') || undefined;
    if (nodePath === 'default') {
      nodePath = await detectNodePath();
    }

    if (this.log.enabled && nodePath) {
      this.log.debug(`Using nodePath: ${nodePath}`);
    }

    let nodeArgv: string[] = adapterConfig.get<string[]>('nodeArgv') || [];
    if (this.log.enabled) {
      this.log.debug(`Using node arguments: ${JSON.stringify(nodeArgv)}`);
    }

    return Object.assign(config, {
      cwd,
      profileName,
      env,
      nodePath,
      nodeArgv
    });
  }

}