import * as init from "./001_init.js";

export interface Migration {
  name: string;
  up: string;
}

/** Ordered list of schema migrations. Append new ones; never edit applied ones. */
export const migrations: Migration[] = [init];
