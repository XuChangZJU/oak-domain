import chalk from 'chalk';
import spawn from 'cross-spawn';
import { resolve } from 'path';

// ts-node scripts/build-app-domain & npm link ./app-domain
console.log(`${chalk.greenBright(`build base-app-domain`)}`);

const result = spawn.sync(
    'ts-node',
    [resolve(process.cwd(), 'scripts', 'buildBaseEntityDict.ts')],
    {
        stdio: 'inherit',
        shell: true,
    }
);
// const result2 = spawn.sync('npm -v', [], { stdio: 'inherit', shell: true });

if (result.status === 0) {
    console.log(`${chalk.greenBright(`build 执行完成`)}`);
} else {
    Error(`${chalk.redBright(`build 执行失败`)}`);
    process.exit(1);
}
