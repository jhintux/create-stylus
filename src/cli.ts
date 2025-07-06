import { createProject } from "./main";
import { parseArgumentsIntoOptions } from "./utils/parse-arguments-into-options";
import { promptForMissingOptions } from "./utils/prompt-for-missing-options";
import { renderIntroMessage } from "./utils/render-intro-message";
import type { Args } from "./types";
import chalk from "chalk";
import { checkSystemRequirements } from "./utils/system-validation";
import { showHelpMessage } from "./utils/show-help-message";

export async function cli(args: Args) {
  try {
    renderIntroMessage();

    const { errors } = await checkSystemRequirements();

    if (errors.length > 0) {
      console.log(chalk.red("\n❌ Create-stylus requirements not met:"));
      errors.forEach(error => console.log(chalk.red(`  - ${error}`)));
      process.exit(1);
    }

    const { rawOptions, extensionChoices } = await parseArgumentsIntoOptions(args);
    if (rawOptions.help) {
      showHelpMessage();
      return;
    }

    const options = await promptForMissingOptions(rawOptions, extensionChoices);

    await createProject(options);
  } catch (error: any) {
    console.error(chalk.red.bold(error.message || "An unknown error occurred."));
    return;
  }
}
