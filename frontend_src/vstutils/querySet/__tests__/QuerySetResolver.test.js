import { describe, expect, test } from '@jest/globals';
import { IntegerField } from '../../fields/numbers/integer.js';
import { Model, makeModel } from '../../models';
import { RequestTypes } from '../../utils';
import { QuerySet } from '../QuerySet.ts';
import { ListView, PageView, ViewsTree } from '../../views';
import { QuerySetsResolver } from '../QuerySetsResolver.js';

describe('QuerySetResolver test', () => {
    const idField = new IntegerField({ name: 'id', readOnly: true });
    const Model1 = makeModel(
        class extends Model {
            static declaredFields = [idField];
        },
        'Model1',
    );
    const Model2 = makeModel(
        class extends Model {
            static declaredFields = [idField];
        },
        'Model2',
    );
    const Model3 = makeModel(
        class extends Model {
            static declaredFields = [idField];
        },
        'Model3',
    );

    const models1 = { [RequestTypes.LIST]: Model1, [RequestTypes.RETRIEVE]: Model1 };
    const models2 = { [RequestTypes.LIST]: Model2, [RequestTypes.RETRIEVE]: Model2 };
    const models3 = { [RequestTypes.LIST]: Model3 };
    const qs1 = new QuerySet('path1', models1);
    const qs2 = new QuerySet('path2', models1);
    const qs3 = new QuerySet('path1/{id}/path1', models1);
    const qs4 = new QuerySet('path2/{id}/path2', models1);
    const qs5 = new QuerySet('path1/{id}/path1/{param}/nested', models1);
    const qs6 = new QuerySet('path2/{id}/path2/{param}/nested', models2);
    const qs7 = new QuerySet('path1/{id}/path3', models3);

    const level1_path1 = new ListView({ level: 1, path: '/path1/' }, qs1);
    const level1_path2 = new ListView({ level: 1, path: '/path2/' }, qs2);

    const level2_path1 = new PageView({ level: 2, path: '/path1/{id}/' }, qs1);
    const level2_path2 = new PageView({ level: 2, path: '/path2/{id}/' }, qs2);

    const level3_path1 = new ListView({ level: 3, path: '/path1/{id}/path1/' }, qs3);
    const level3_path2 = new ListView({ level: 3, path: '/path2/{id}/path2/' }, qs4);

    const level4_path1 = new PageView({ level: 4, path: '/path1/{id}/path1/{param}/' }, qs3);
    const level4_path2 = new PageView({ level: 4, path: '/path2/{id}/path2/{param}/' }, qs4);

    const level5_path1 = new ListView({ level: 5, path: '/path1/{id}/path1/{param}/nested/' }, qs5);
    const level5_path2 = new ListView({ level: 5, path: '/path2/{id}/path2/{param}/nested/' }, qs6);

    const level3_path3 = new ListView({ level: 3, path: 'path1/{id}/path3' }, qs7);
    const views = new Map(
        [
            level1_path1,
            level1_path2,
            level2_path1,
            level2_path2,
            level3_path1,
            level3_path2,
            level3_path3,
            level4_path1,
            level4_path2,
            level5_path1,
            level5_path2,
        ].map((view) => [view.path, view]),
    );
    const resolver = new QuerySetsResolver(new ViewsTree(views));

    test('test nested queryset', () => {
        // test nested qs
        expect(resolver.findQuerySet('Model2', level3_path2.path)).toStrictEqual(qs6);
        // test parent qs
        expect(resolver.findQuerySet('Model1', level3_path2.path)).toStrictEqual(qs4);
        // test sibling qs
        expect(resolver.findQuerySet('Model3', level3_path2.path)).toStrictEqual(qs7);
        // test invalid model
        expect(() => resolver.findQuerySet('Model4', level3_path2.path)).toThrow();
    });
});
