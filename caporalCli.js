const fs = require("fs");
const path = require("path");
const CruParser = require("./CruParser.js");

const cli = require("@caporal/core").default;

cli
  .version("cru-parser-cli")
  .version("0.1")
  .command(
    "readAllEdt",
    "Read and parse all .cru files from the given directory"
  )
  .argument("<directory>", "The directory containing .edt.cru files")
  .option("-t, --showTokenize", "Log the tokenization results", {
    validator: cli.BOOLEAN,
    default: false,
  })
  .action(({ args, options, logger }) => {
    const directoryPath = args.directory;

    // Check if the directory exists
    if (!fs.existsSync(directoryPath)) {
      return logger.error(`The directory ${directoryPath} does not exist.`);
    }

    // Get all .edt.cru files in the directory
    const files = fs
      .readdirSync(directoryPath)
      .filter((file) => file.endsWith(".cru"));

    if (files.length === 0) {
      return logger.info(`No .edt.cru files found in ${directoryPath}.`);
    }

    logger.info(`Found ${files.length} .cru file(s) in ${directoryPath}.`);

    files.forEach((file) => {
      const filePath = path.join(directoryPath, file);
      logger.info(`Processing file: ${filePath}`);

      fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
          logger.warn(`Error reading file ${file}: ${err.message}`);
          return;
        }

        const parser = new CruParser(options.showTokenize, options.showSymbols);
        parser.parse(data);

        if (parser.errorCount === 0) {
          logger.info(`File ${file} successfully parsed.`);
          logger.info("%s", JSON.stringify(parser.parsedData, null, 2));
        } else {
          logger.warn(`File ${file} contains errors.`);
        }
      });
    });
  });

cli.run(process.argv.slice(2));
