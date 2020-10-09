#!/usr/bin/env npx ts-node
import { spawn } from "child_process";

const myEnv = require('dotenv').config();
for (const k in myEnv) {
  process.env[k] = myEnv[k];
}
const { METADATA_PACKAGE_ID, MAJOR_RELEASE, SF_GITHUB_TOKEN } = process.env;

class ExecResult {
  stdout = "";
  exitCode = 0;
}

/**
 * Executes a process
 */
async function exec(
  command: string,
  args: string[] = [],
  allowAllExitCodes: boolean = false
): Promise<ExecResult> {
  process.stdout.write(`EXEC: ${command} ${args.join(" ")}\n`);
  return new Promise((resolve, reject) => {
    const execResult = new ExecResult();
    const cp = spawn(command, args, {});

    // STDOUT
    cp.stdout.on("data", (data) => {
      process.stdout.write(data);
      execResult.stdout += data.toString();
    });

    // STDERR
    cp.stderr.on("data", (data) => {
      process.stderr.write(data);
    });

    // Close
    cp.on("close", (code) => {
      execResult.exitCode = code;
      if (code === 0 || allowAllExitCodes) {
        resolve(execResult);
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });
  });
}

async function generateVersionNumber() {
  let result = {
    current: '1.0',
    next: '1.0'
  }
  const majorRelease = MAJOR_RELEASE === 'true';
  try {
    const checkVersionResult = await exec("sfdx", ["force:package1:version:list", '-i', METADATA_PACKAGE_ID, '--json']);
    const parsed = JSON.parse(checkVersionResult.stdout);
    if (parsed && parsed.result && parsed.result.length > 0) {
      const last = parsed.result.reverse()[0];

      if (majorRelease) {
        result.current = `${parseFloat(last.Version)}`;
        const versionPart = last.Version.split('.');
        const majorVersion = parseInt(versionPart[1]) + 1
        result.next = `${parseFloat(`${versionPart[0]}.${majorVersion}`)}`;
      } else {
        result.current = `${parseInt(last.Version)}.0`;
        result.next = `${(parseInt(last.Version) + 1)}.0`;
      }
    }
  } catch (err) {
    console.error('generate version number', err);
    throw err;
  }

  return result;
}

async function checkingUploadProgress(uploadRequestId) {
  const loopCount = 60;
  let count = 0;
  while (count < loopCount) {
    await sleep(30000)//30s

    const response = await exec("sfdx", ["force:package1:version:create:get", '-i', uploadRequestId, '--json']);
    const uploadStatusResponse = JSON.parse(response.stdout)
    const uploadStatus = uploadStatusResponse.result.Status;

    switch (uploadStatus) {
      case 'SUCCESS':
        return uploadStatusResponse.result.MetadataPackageVersionId;
      case 'Queued':
        console.log('Upload is in Queued');
        break;
      case 'In Progress':
        console.log('Upload is in Progress');
        break;
      case 'Error':
        console.log('Upload error', uploadStatusResponse.result.Errors);
        throw new Error(uploadStatusResponse.result.Errors);
      default:
        console.log('Unexpected status', uploadStatus);
        throw new Error(uploadStatus);
    }
    if (count === loopCount - 1) {
      // timeout
      throw new Error('Upload Package timeout: the upload progress is more than 30 minutes. Please check the progress in the Package Manager page of your Package Org.');
    }
    count++;
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

(async function main() {
  const packageDescription = `A Lightning Web Component displays Salesforce's folder of a structural hierarchy.`
  try {
    const packageVersion = await generateVersionNumber();

    const uploadRequest = await exec("sfdx", ["force:package1:version:create", '--packageid', METADATA_PACKAGE_ID, '-n', packageVersion.next, '-v', packageVersion.next, '-d', `"${packageDescription}"`, "--json"]);

    const uploadRequestId = JSON.parse(uploadRequest.stdout).result.Id;
    const packageVersionId = await checkingUploadProgress(uploadRequestId);

    const newGithubTag = `v${packageVersion.next}`;
    const uploadedPackageURL = `https://login.salesforce.com/packaging/installPackage.apexp?p0=${packageVersionId}`;
    const releaseBody = `Package URL: ${uploadedPackageURL}`;
    await exec("git", ["tag", '-a', newGithubTag, '-m', `"${newGithubTag}"`]);
    await exec("git", ["push", 'origin', newGithubTag]);
    await exec("github-release", ["upload", "--token", SF_GITHUB_TOKEN, "--owner", "hanabiiii", "--repo", "lightning-folder", "--tag", newGithubTag, "--release-name", newGithubTag, "--body", releaseBody, "--prerelease=false"])

  } catch (e) {
    console.error("Unhandled error", e);
    process.exitCode = 1;
  }
})();