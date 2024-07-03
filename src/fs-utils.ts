import * as fs from "node:fs/promises";
import {baseLogger} from "./logger";


const logger = baseLogger.child({name: 'fs-utils'});

/**
 * Making sure a path is an empty directory, if not exist than create and if not empty then clean all files
 */
export async function makeSureEmptyDirectory(path: string): Promise<void> {
    const logObj = {path};
    logger.debug(logObj, 'creating / emptying directory %s');

    try {
        await fs.access(path);
    } catch (error) {
        logger.debug({
            ...logObj,
            error: error,
        }, 'Folder does not exit or may not have a permission, try creating it anyway...');

        try {
            await fs.mkdir(path);
        } catch (error) {
            logger.debug({...logObj, error: error}, 'Failed to create directory');

            throw error;
        }

        return;
    }

    const stat = await fs.lstat(path);

    if (!stat.isDirectory()) {
        logger.error(logObj, 'not a directory', path);

        throw new Error(`${path} is not a directory`)
    }

    const filesInDir = await fs.readdir(path);

    if (filesInDir.length === 0) {
        return;
    }

    logger.warn({...logObj, filesInDir}, 'Removing non-empty directory')

    await fs.rm(path, {recursive: true});

    await fs.mkdir(path);
}

