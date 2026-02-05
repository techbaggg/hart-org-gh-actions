const { readFileSync } = require("fs");
const { createHash } = require("crypto");

// Function to create a SHA-256 hash of a given input string
function createSHA256Hash(input) {
  const hash = createHash("sha256");
  hash.update(input);
  return hash.digest("hex");
}

function getUniqueDetectionsFromFile(filename) {
  const detections = [];
  const contents = readFileSync(filename, "utf8");
  // console.log(contents);
  const lines = contents.split("\n");
  for (const l of lines) {
    if (l.length === 0) {
      continue;
    }

    const json = JSON.parse(l);
    const {
      SourceMetadata: {
        Data: {
          Filesystem: { file, line },
        },
      },
      Raw,
    } = json;
    const hash = createSHA256Hash(`${file}:${line}:${Raw}`);
    detections.push(hash);
  }

  return detections;
}

function getMapOfDetectionsFromFile(filename) {
  const hashToFileLineMap = new Map();
  const contents = readFileSync(filename, "utf8");
  const lines = contents.split("\n");
  for (const l of lines) {
    if (l.length === 0) {
      continue;
    }

    const json = JSON.parse(l);
    const {
      SourceMetadata: {
        Data: {
          Filesystem: { file, line },
        },
      },
      Raw,
    } = json;
    const hash = createSHA256Hash(`${file}:${line}:${Raw}`);

    hashToFileLineMap.set(hash, `${file}:${line}`);
  }

  return hashToFileLineMap;
}

// Function to identify elements in B that are NOT in A
function findElementsNotInA(arrayA, arrayB) {
  return arrayB.filter((element) => !arrayA.includes(element));
}

function main() {
  const PARENT = "trufflehog-parent.json";
  const SELF = "trufflehog-self.json";

  const parentDetections = getUniqueDetectionsFromFile(PARENT);
  const selfDetections = getUniqueDetectionsFromFile(SELF);

  const newDetections = findElementsNotInA(parentDetections, selfDetections);
  const hashToFileLineMap = getMapOfDetectionsFromFile(SELF);

  if (newDetections.length > 0) {
    console.error(`${newDetections.length} New Trufflehog detection(s) found!`);
    console.error(
      `Please run trufflehog locally and resolve the detections at the following locations:`,
    );
    console.error(
      `(Note: the hash is calculated from a sha256 of the file, line number, and the raw string value of the detection concatenated together with colons (:)`,
    );
    for (const detection of newDetections) {
      const fileLine = hashToFileLineMap.get(detection);
      console.error(`  - ${fileLine} (hash: ${detection})`);
    }
    process.exit(1);
  }

  console.log("No new Trufflehog detections found!");
  process.exit(0);
}

main();
