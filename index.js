/** import */
const https = require('https');
const fs = require('fs');
// npm
const core = require('@actions/core');
const exec = require('@actions/exec');
const artifact = require('@actions/artifact')
/**  */

/** var */
var directoryInput;
var scanOption;

/** const */
const DIRECTORY = 'directory';
const TABLE = 'table';
const ALL = 'all'


async function run() {
    try {
        // Download the script using https
        const options = {
            hostname: 'raw.githubusercontent.com',
            path: '/carbonetes/diggity/main/install.sh',
            method: 'GET'
        };
        const request = https.request(options, response => {
            let script = '';
            response.on('data', chunk => {
                script += chunk;
            });
            response.on('end', async () => {
                // Save the script to a file
                await fs.promises.writeFile('./install.sh', script);

                // Make the script executable
                await exec.exec('chmod', ['+x', './install.sh']);

                // Run the script with the -d option to specify the installation directory
                await exec.exec('./install.sh');

                // Installation successful
                core.info('Diggity has been installed');


                // Check scan option based on user's input
                scanOption = checkScanOption();

                // Call the diggity binary
                await constructCommandExec(scanOption)
            });
        });
        request.on('error', error => {
            core.setFailed(error.message);
        });
        request.end();

    } catch (error) {
        core.setFailed(error.message);
    }
}

// Check user's input and set scan option
function checkScanOption() {
    directoryInput = core.getInput('directory', { required: true })
    if (directoryInput !== null || directoryInput !== '') {
        return DIRECTORY;
    }
}

// Check user's input for output type
function checkOutputType() {
    let outputType = core.getInput('output_type')
    if (outputType === null || outputType === '') {
        return TABLE;
    }
    return outputType
}

// Check user's input for enabled parsers
function checkEnabledParsers() {
    let enabledParsers = core.getInput('enabled_parsers')
    if (enabledParsers === null || enabledParsers === '' || enabledParsers.toUpperCase() === ALL) {
        return ALL;
    }
    return enabledParsers
}

// Check user's input for output file
function checkOutputFile() {
    let outputFile = core.getInput('output_file')
    if (outputFile === null || outputFile === '') {
        return null;
    }
    return outputFile
}

// Upload SBOM as an artifact
async function uploadSBOM(sbomFile) {
    if (sbomFile === null || sbomFile === '') return
    const client = artifact.create()
    const files = [sbomFile]
    const rootDir = "."
    await client.uploadArtifact(sbomFile, files, rootDir)
}

async function constructCommandExec(scanOption) {
    // Check scan option
    switch (scanOption) {
        case DIRECTORY:
            // Check for output type
            const outputType = checkOutputType()
            let args = ["-d", directoryInput, "-o", outputType]

            // Check for enabled parsers
            const enabledParsers = checkEnabledParsers()
            if (enabledParsers !== ALL) args.push(`--enabled-parsers=${enabledParsers}`)

            // Check for output file
            const outputFile = checkOutputFile()
            if (outputFile !== null) args.push('-f', outputFile)

            // Execute Diggity
            exec.exec('./bin/diggity', args)
            .then(()=>{
                // Upload SBOM
                uploadSBOM(outputFile)
            })

            break;

        default:
            core.setFailed('Scan Option not found')
            break;
    }
}

// Start diggity-Action
run();