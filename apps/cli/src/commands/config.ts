
/**
 * flow config - Manage flow configuration
 */
import { intro, outro } from '@clack/prompts';
import { getFlowConfig, GlobalOptions } from '../lib/config.js';
import pc from 'picocolors';

export interface ConfigOptions {
  project?: string;
}

export async function configCommand(options: ConfigOptions, globalOptions: GlobalOptions): Promise<void> {
  intro('⚙️ Flow Configuration');

  const projectPath = options.project ? require('path').resolve(options.project) : process.cwd();
  const cfg = await getFlowConfig(globalOptions, projectPath);

  console.log(pc.bold('Current Configuration:'));
  console.log(JSON.stringify(cfg, null, 2));

  outro('⚙️ Configuration check complete.');
}
