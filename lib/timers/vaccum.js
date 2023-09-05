"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vaccumEntities = void 0;
const tslib_1 = require("tslib");
const dayjs_1 = tslib_1.__importDefault(require("dayjs"));
const fs_1 = require("fs");
const filter_1 = require("../store/filter");
const stream_1 = require("stream");
const uuid_1 = require("../utils/uuid");
/**
 * 删除数据库中的部分数据，减少体积
 * 一般只删除日志类数据
 * @param option
 */
async function vaccumEntities(option, context) {
    const { entities, backupDir } = option;
    for (const ele of entities) {
        const { entity, filter, aliveLine } = ele;
        let filter2 = {
            $$createAt$$: {
                $lt: aliveLine,
            },
        };
        if (filter) {
            filter2 = (0, filter_1.combineFilters)(entity, context.getSchema(), [filter2, filter]);
        }
        if (backupDir && process.env.OAK_PLATFORM === 'server') {
            // 使用mysqldump将待删除的数据备份出来
            const { zip: zip } = option;
            const now = (0, dayjs_1.default)();
            const backFile = `${backupDir}/${entity}-${now.format('YYYY-MM-DD HH:mm:ss')}.csv`;
            if ((0, fs_1.existsSync)(backFile)) {
                (0, fs_1.rmSync)(backFile);
            }
            const fd = (0, fs_1.openSync)(backFile, 'a');
            const attributes = ['id', '$$createAt$$', '$$updateAt$$', '$$deleteAt$$'];
            const projection = {
                id: 1,
                $$createAt$$: 1,
                $$updateAt$$: 1,
                $$deleteAt$$: 1,
            };
            for (const attr in context.getSchema()[entity].attributes) {
                Object.assign(projection, {
                    [attr]: 1,
                });
                attributes.push(attr);
            }
            (0, fs_1.appendFileSync)(fd, attributes.join(','));
            (0, fs_1.appendFileSync)(fd, '\n');
            let count = 0;
            const appendData = async (minCreateAt) => {
                const filter3 = (0, filter_1.combineFilters)(entity, context.getSchema(), [filter2, {
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
                const csvTxt = rows.map((row) => attributes.map((attr) => JSON.stringify(row[attr])).join(',')).join('\n');
                (0, fs_1.appendFileSync)(fd, csvTxt);
                (0, fs_1.appendFileSync)(fd, '\n');
                count += rows.length;
                if (rows.length === 1000) {
                    const maxCreateAt = rows[999].$$createAt$$;
                    return appendData(maxCreateAt);
                }
            };
            await appendData(0);
            (0, fs_1.closeSync)(fd);
            console.log(`备份${entity}对象完毕，共备份了${count}行数据`);
            if (count === 0) {
                (0, fs_1.rmSync)(backFile);
            }
            else if (zip) {
                const { createGzip } = require('zlib');
                const gzip = createGzip();
                const source = (0, fs_1.createReadStream)(backFile);
                const destination = (0, fs_1.createWriteStream)(`${backFile}.zip`);
                await new Promise((resolve, reject) => {
                    (0, stream_1.pipeline)(source, gzip, destination, (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(undefined);
                        }
                    });
                });
            }
        }
        // 将对应的数据删除
        await context.operate(entity, {
            id: await (0, uuid_1.generateNewIdAsync)(),
            action: 'remove',
            data: {},
            filter: filter2,
        }, { deletePhysically: true });
    }
}
exports.vaccumEntities = vaccumEntities;
