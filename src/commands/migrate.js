const fs = require('fs');
const querybuilderpg = require('querybuilderpg');
/**
 * migrateCommand:
 *  1) Reads the generated alter.sql
 *  2) Splits by “-- step”
 *  3) Attempts to run all queries or locate errors with a binary search approach
 */
async function migrateCommand(config) {
    let configsafe = CLONE(config);

    // remove postgres password and username from postgres config
    configsafe.postgresdb = configsafe.postgres.replace(/.*@/g, '');
    delete configsafe.postgres;
    console.log('Running "migrate" with config:', configsafe);

    // Initialize DB connection
    querybuilderpg.init('', 'postgresql://' + config.postgres, 10);

    // READ final alter file
    const alterFile = fs.readFileSync(config.output_file, 'utf8');
    const alterSteps = alterFile.split('-- step');

    console.log('Starting migration...');
    console.time('Migration time');

    let isError = false;
    try {
        // Attempt to run everything first
        await DATA.query(alterFile).promise();
        console.timeEnd('Migration time');
        console.log('Migration complete with no errors.');
        return;
    } catch (e) {
        console.log(e);
        isError = true;
    }

    // If an error occurs, we’ll binary search among the steps
    let begin = 0;
    let end = alterSteps.length;
    let middle;

    while (begin < end && isError) {
        middle = Math.floor((begin + end) / 2);
        const partialQuery = alterSteps.slice(begin, middle + 1).join('\n');

        try {
            await DATA.query(partialQuery).promise();
            // If it succeeds, move the window forward
            begin = middle + 1;
        } catch (e) {
            // If it fails, move the window end backward
            end = middle;
        }
    }

    // If we still couldn’t isolate the error but begin == end
    if (begin === end && isError) {
        try {
            const finalQuery = alterSteps.slice(begin, begin + 1).join('\n');
            await DATA.query(finalQuery).promise();
            console.log('Error evidently triggered in a prior step, but was not isolated.');
        } catch (e) {
            console.log(`\nError in step #${begin + 1}:`);
            console.log('Query:\n\n', alterSteps[begin]);
            console.log('Error:\n\n', e);
        }
    }

    console.timeEnd('Migration time');
    process.exit(1);
}

module.exports = { migrateCommand }; 