import type { Args, StylusExtension, RawOptions, ExtensionChoices } from "../types";
import arg from "arg";
import { getExtensionDirsFromExternalExtension, validateExternalExtension } from "./external-extensions";
import chalk from "chalk";
import { STYLUS_EXTENSIONS } from "./consts";
import { validateNpmName } from "./validate-name";

export async function parseArgumentsIntoOptions(
  rawArgs: Args,
): Promise<{ rawOptions: RawOptions; extensionChoices: ExtensionChoices }> {
  const args = arg(
    {
      "--skip-install": Boolean,
      "--skip": "--skip-install",

      "--dev": Boolean,

      "--extension": extensionHandler,
      "-e": "--extension",

      "--help": Boolean,
      "-h": "--help",
    },
    {
      argv: rawArgs.slice(2),
    },
  );

  const skipInstall = args["--skip-install"] ?? null;

  const dev = args["--dev"] ?? false; // info: use false avoid asking user

  const help = args["--help"] ?? false;

  let project: string | null = args._[0] ?? null;

  // Check if the extension is a built-in extension or external extension
  const extensionArg = args["--extension"];
  let extension: StylusExtension | null = null;
  let externalExtension = null;

  if (extensionArg) {
    if (Object.values(STYLUS_EXTENSIONS).includes(extensionArg as StylusExtension)) {
      extension = extensionArg as StylusExtension;
    } else {
      // It's an external extension
      externalExtension = await validateExternalExtension(extensionArg, dev);
    }
  }

  // if dev mode, extension would be a string
  if (externalExtension && typeof externalExtension === "object" && !externalExtension.isTrusted) {
    console.log(
      chalk.yellow(
        ` You are using a third-party extension. Make sure you trust the source of ${chalk.yellow.bold(
          externalExtension.repository,
        )}\n`,
      ),
    );
  }

  if (project) {
    const validation = validateNpmName(project);
    if (!validation.valid) {
      console.error(
        `Could not create a project called ${chalk.yellow(`"${project}"`)} because of naming restrictions:`,
      );

      validation.problems.forEach(p => console.error(`${chalk.red(">>")} Project ${p}`));
      project = null;
    }
  }

  let extensionChoices = [
    STYLUS_EXTENSIONS.HELLO_WORLD,
    STYLUS_EXTENSIONS.ERC20,
    STYLUS_EXTENSIONS.ERC721,
    STYLUS_EXTENSIONS.MULTICALL,
  ];

  if (externalExtension) {
    const externalExtensionDirs = await getExtensionDirsFromExternalExtension(externalExtension);

    if (externalExtensionDirs.length !== 0) {
      extensionChoices = externalExtensionDirs;
    }
  }

  // Set install based on skipInstall flag
  let install: boolean | null = null;
  if (skipInstall !== null) {
    install = !skipInstall;
  }

  return {
    rawOptions: {
      project,
      install,
      dev,
      externalExtension,
      help,
      extension,
    },
    extensionChoices,
  };
}

const EXTENSION_OPTIONS = [...Object.values(STYLUS_EXTENSIONS), "none"];
function extensionHandler(value: string) {
  const lowercasedValue = value.toLowerCase();
  if (EXTENSION_OPTIONS.includes(lowercasedValue)) {
    return lowercasedValue as StylusExtension | "none";
  }

  // If it's not a built-in extension, return as is for external extension validation
  return value;
}
