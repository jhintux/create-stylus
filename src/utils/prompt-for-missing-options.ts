import { Options, RawOptions, ExtensionChoices } from "../types";
import inquirer from "inquirer";
import { STYLUS_EXTENSIONS } from "./consts";
import { validateNpmName } from "./validate-name";

// default values for unspecified args
const defaultOptions: RawOptions = {
  project: "my-dapp-example",
  extension: null,
  install: true,
  dev: false,
  externalExtension: null,
  help: false,
};

export async function promptForMissingOptions(
  options: RawOptions,
  extensionChoices: ExtensionChoices,
): Promise<Options> {
  const cliAnswers = Object.fromEntries(Object.entries(options).filter(([, value]) => value !== null));
  const questions = [
    {
      type: "input",
      name: "project",
      message: "Your project name:",
      default: defaultOptions.project,
      validate: (name: string) => {
        const validation = validateNpmName(name);
        if (validation.valid) {
          return true;
        }
        return "Project " + validation.problems[0];
      },
    },
    {
      type: "list",
      name: "extension",
      message: "What type of contract do you want to create?",
      choices: extensionChoices,
      default: STYLUS_EXTENSIONS.HELLO_WORLD,
    },
  ];

  // Only add install question if it's not already set via CLI arguments
  if (options.install === null) {
    questions.push({
      type: "confirm",
      name: "install",
      message: "Install packages?",
      default: true,
    } as any);
  }

  const answers = await inquirer.prompt(questions, cliAnswers);

  const extension = options.extension ?? answers.extension;
  const mergedOptions: Options = {
    project: options.project ?? answers.project,
    install: options.install ?? answers.install,
    dev: options.dev ?? defaultOptions.dev,
    extension: extension === "none" ? null : extension,
    externalExtension: options.externalExtension,
  };

  return mergedOptions;
}
