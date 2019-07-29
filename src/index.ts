import { config } from "./config";
import { Model, observeModel, SubModel } from "./model";
import { Store } from "./store";

export * from "./config";
export * from "./model";
export * from "./schema";
export * from "./store";
export const pouchx = { config, Model, observeModel, SubModel, Store };
export default pouchx;
