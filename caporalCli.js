const fs = require("fs");
const path = require("path");
const CruParser = require("./CruParser.js");

const cli = require("@caporal/core").default;

cli
  .version("cru-parser-cli")
  .version("0.1")
  // Read and parse a single .cru file
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
  })

  // Check for available rooms in the given time slot
  .command("getroom", "Get available rooms for a given time slot")
  .argument("<hours>", "The time slot to check for available rooms")
  .argument("<file>", "The .cru file to read")
  .action(({ args, logger }) => {
    const hours = args.hours;
    const file = args.file;

    // Check if the time slot is in the correct format
    const hoursRegex = /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/;
    if (!hoursRegex.test(hours)) {
      return logger.error(
        "SRUPC_2_E1: Invalid time slot format. Expected format: HH:MM-HH:MM"
      );
    }

    // Check if the file exists
    if (!fs.existsSync(file)) {
      return logger.error(`The file ${file} does not exist.`);
    }

    // Load the .cru file and check for available rooms
    const parser = new CruParser(false, false);
    parser.parse(fs.readFileSync(file, "utf8")); // Make sure to change the path to the .cru file

    const availableRooms = parser.getAvailableRooms(hours);
    if (availableRooms.length === 0) {
      logger.info("No available rooms found for the given time slot.");
    } else {
      logger.info("Available rooms:");
      availableRooms.forEach((room) => logger.info(room));
    }
  })

  .command("availability", "Check the availability of a room")
  .argument("<room>", "The name of the room to check availability for")
  .argument("<file>", "The .cru file to parse")
  .action(({ args, logger }) => {
    const room = args.room;
    const file = args.file;

    // Vérifier si le fichier existe
    if (!fs.existsSync(file)) {
      return logger.error(`File not found: ${file}`);
    }

    // Charger les données et vérifier la disponibilité de la salle
    const parser = new CruParser(false, false);
    parser.parse(fs.readFileSync(file, "utf8"));

    const availability = parser.getRoomAvailability(room);
    if (availability.length === 0) {
      logger.info(`No availability found for room: ${room}`);
    } else {
      logger.info(`Availability for room ${room}:`);
      availability.forEach((slot) => logger.info(slot));
    }
  });

cli.run(process.argv.slice(2));
