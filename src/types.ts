export type Args = string[];
export type StylusExtension = "hello-world" | "erc20" | "erc721" | "multicall";
export type ExternalExtensionNameDev = string;

export type ExternalExtension = {
  repository: string;
  branch?: string | null;
};

type BaseOptions = {
  project: string | null;
  install: boolean | null;
  dev: boolean;
  externalExtension: ExternalExtension | ExternalExtensionNameDev | null;
  extension: StylusExtension | null;
};

export type RawOptions = BaseOptions & {
  help: boolean;
};

export type Options = {
  [Prop in keyof Omit<BaseOptions, "externalExtension" | "extension">]: NonNullable<BaseOptions[Prop]>;
} & {
  externalExtension: RawOptions["externalExtension"];
  extension: StylusExtension | null;
};

export type TemplateDescriptor = {
  path: string;
  fileUrl: string;
  relativePath: string;
  source: string;
};

export type ExtensionChoices = (StylusExtension | { value: any; name: string })[];
