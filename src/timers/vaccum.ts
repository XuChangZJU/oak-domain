import dayJs from 'dayjs';
import { appendFileSync, existsSync, openSync, rmSync, closeSync, createReadStream, createWriteStream } from 'fs';
import assert from 'assert';
import { EntityDict } from '../types/Entity';
import { EntityDict as BaseEntityDict } from '../base-app-domain';
import { AsyncContext } from '../store/AsyncRowStore';
import { combineFilters } from '../store/filter';
import { createGzip } from 'node:zlib';
import { pipeline } from 'stream';
import { generateNewIdAsync } from '../utils/uuid';

type VaccumOptionEntity<ED extends EntityDict & BaseEntityDict, T extends keyof ED> = {
    entity: T;
    filter?: ED[T]['Selection']['filter'];      // 如果有额外的条件，放在filter中（满足条件的才会被清空）
    aliveLine: number;          // vaccum一定是按createAt清空数据，在aliveLine之后的数据不会被清空
};

type VaccumOption<ED extends EntityDict & BaseEntityDict> = {
    entities: Array<VaccumOptionEntity<ED, keyof ED>>;
    backupDir?: string;
    zip?: boolean;
};

/**
 * 删除数据库中的部分数据，减少体积
 * @param option 
 */
export async function vaccumEntities<ED extends EntityDict & BaseEntityDict, Cxt extends AsyncContext<ED>>(option: VaccumOption<ED>, context: Cxt) {
    const { entities, backupDir } = option;
    for (const ele of entities) {
        const { entity, filter, aliveLine } = ele;

        let filter2: ED[keyof ED]['Selection']['filter'] = {
            $$createAt$$: {
                $lt: aliveLine,
            },
        };
        if (filter) {
            filter2 = combineFilters([filter2, filter]);
        }
        if (backupDir) {
            // 使用mysqldump将待删除的数据备份出来
            const { zip: zip } = option;
            const now = dayJs();
            const backFile = `${backupDir}/${entity as string}-${now.format('YYYY-MM-DD HH:mm:ss')}.csv`;
            if (existsSync(backFile)) {
                rmSync(backFile);
            }
            const fd = openSync(backFile, 'a');
            const attributes = ['id', '$$createAt$$', '$$updateAt$$', '$$deleteAt$$'];
            const projection: ED[keyof ED]['Selection']['data']= {
                id: 1,
                $$createAt$$: 1,
                $$updateAt$$: 1,
                $$deleteAt$$: 1,
            };
            for (const attr in context.getSchema()[entity]!.attributes) {
                Object.assign(projection, {
                    [attr]: 1,
                });
                attributes.push(attr);
            }
            appendFileSync(fd, attributes.join(','));
            appendFileSync(fd, '\n');


            let count = 0;
            const appendData = async (minCreateAt: number): Promise<void> => {
                const filter3 = combineFilters([filter2, {
                    $$createAt$$: {
                        $gt: minCreateAt,
                    },
                }]);
                const rows = await context.select(entity, {
                    data: projection,
                    filter: filter3,
                    sorter: [{
                        $attr: {
                            $$createAt$$: 1,
                        },
                        $direction: 'asc'
                    }],
                    indexFrom: 0,
                    count: 1000,
                }, { includedDeleted: true });
                const csvTxt = rows.map(
                    (row) => attributes.map(
                        (attr) => JSON.stringify(row[attr])
                    ).join(',')
                ).join('\n');
                appendFileSync(fd, csvTxt);
                appendFileSync(fd, '\n');
                count += rows.length;
                if (rows.length === 1000) {
                    const maxCreateAt = rows[999].$$createAt$$;
                    return appendData(maxCreateAt as number);
                }
            };

            await appendData(0);
            closeSync(fd);
            console.log(`备份${entity as string}对象完毕，共备份了${count}行数据`);

            if (count === 0) {
                rmSync(backFile);
            }
            else if (zip) {
                const gzip = createGzip();
                const source = createReadStream(backFile);
                const destination = createWriteStream(`${backFile}.zip`);
                await new Promise(
                    (resolve, reject) => {
                        pipeline(source, gzip, destination, (err) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve(undefined);
                            }
                        })     
                    }
                );
            }
        }

        // 将对应的数据删除
        await context.operate(entity, {
            id: await generateNewIdAsync(),
            action: 'remove',
            data: {},
            filter: filter2,
        }, { deletePhysically: true });
    }
}