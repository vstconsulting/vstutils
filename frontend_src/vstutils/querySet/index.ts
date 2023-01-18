export * from './QuerySet';
import { SingleEntityQueryset } from './SingleEntityQueryset.js';
import { QuerySetsResolver } from './QuerySetsResolver.js';
import { mapToObjectProxy } from '../utils';
import { QuerySet } from './QuerySet';

/**
 * Object, that contains QuerySet classes.
 * QuerySet - class, that manages filtering/getting/updating/deleting of Model instances.
 */
const globalQuerySets = new Map([['QuerySet', QuerySet]]);

/**
 * @deprecated
 * @type {Object<string, BaseField>}
 */
const guiQuerySets = mapToObjectProxy(globalQuerySets);

export { guiQuerySets, SingleEntityQueryset, QuerySetsResolver, globalQuerySets };
