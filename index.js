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

// Check user's input for disable file listing
function checkDisableFileListing() {
    let disableFileListing = core.getInput('disable_file_listing')
    return disableFileListing.trim().toUpperCase() === "TRUE"
}

// Check user's input for disable secret search
function checkDisableSecretSearch() {
    let disableSecretSearch = core.getInput('disable_secret_search')
    return disableSecretSearch.trim().toUpperCase() === "TRUE"
}

// Check user's input for secret exclude filenames
function checkSecretExcludeFilenames() {
    let secretExcludeFilenames = core.getInput('secret_exclude_filenames')
    if (secretExcludeFilenames === null || secretExcludeFilenames === '') {
        return null;
    }
    return secretExcludeFilenames
}

// Check user's input for secret max file size
function checkSecretMaxFileSize() {
    let secretMaxFileSize = core.getInput('secret_max_file_size')
    if (secretMaxFileSize === null || secretMaxFileSize === '' || isNaN(secretMaxFileSize.trim())) {
        return null;
    }
    return secretMaxFileSize
}

// Check user's input for secret content regex
function checkSecretsContentRegex() {
    let secretsContentRegex = core.getInput('secrets_content_regex')
    if (secretsContentRegex === null || secretsContentRegex === '') {
        return null;
    }
    return secretsContentRegex
}

// Upload SBOM as an artifact
async function uploadSBOM() {
    let sbomFile = core.getInput('output_file')
    if (sbomFile === null || sbomFile === '') return
    const client = artifact.create()
    const files = [sbomFile]
    const rootDir = "."
    await client.uploadArtifact(sbomFile, files, rootDir)
}

// Build flag args
function buildFlagArgs(args) {
    // Check for disable file listing
    if (checkDisableFileListing()) args.push('--disable-file-listing')

    // Check for disable secret search
    if (checkDisableSecretSearch()) args.push('--disable-secret-search')

    // Check for output file
    const outputFile = checkOutputFile()
    if (outputFile !== null) args.push('-f', outputFile)

    // Check for enabled parsers
    const enabledParsers = checkEnabledParsers()
    if (enabledParsers !== ALL) args.push(`--enabled-parsers=${enabledParsers}`)

    // Check for secret exclude filenames
    const secretExcludeFilenames = checkSecretExcludeFilenames()
    if (secretExcludeFilenames !== null) args.push(`--secret-exclude-filenames=${secretExcludeFilenames}`)

    // Check for secret max file size
    const secretMaxFileSize = checkSecretMaxFileSize()
    if (secretMaxFileSize !== null) args.push(`--secret-max-file-size=${secretMaxFileSize}`)

    // Check for secrets content regex
    const secretsContentRegex = checkSecretsContentRegex()
    if (secretsContentRegex !== null) args.push(`--secrets-content-regex=${secretsContentRegex}`)

    return args
}

async function constructCommandExec(scanOption) {
    // Check scan option
    switch (scanOption) {
        case DIRECTORY:
            // Check for output type
            const outputType = checkOutputType()
            const args = buildFlagArgs(["-d", directoryInput, "-o", outputType])

            // Execute Diggity
            exec.exec('./bin/diggity', args)
            .then(()=>{
                // Upload SBOM
                uploadSBOM()
            })

            break;

        default:
            core.setFailed('Scan Option not found')
            break;
    }
}

// Start diggity-Action
run();