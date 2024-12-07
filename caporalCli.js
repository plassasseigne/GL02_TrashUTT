const fs = require("fs");
const path = require("path");
const CruParser = require("./CruParser.js");

const cli = require("@caporal/core").default;

// Helper function to recursively find .cru files
function findCruFiles(dir, fileList = []) {
  let cruFiles = [];
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      cruFiles = cruFiles.concat(findCruFiles(filePath, fileList));
    } else if (file.endsWith(".cru")) {
      cruFiles.push(filePath);
    }
  });

  return cruFiles;
}

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
  .command("checkRoom", "Check the room and the capacity of a course")
  .argument("<name>", "The course that we want to know the room")
  .action(({ args, logger }) => {
    const courseName = args.name.toUpperCase();
    const dataDir = "data";

    // Get the first letter of the course name
    const firstLetter = courseName[0];

    // Determine the folder based on letter pair
    const letterPairs = fs
      .readdirSync(dataDir)
      .filter((folder) => /^[A-Z]{2}$/.test(folder)); // Find folders matching two-letter pattern

    let targetFolder = null;
    for (const pair of letterPairs) {
      if (pair.includes(firstLetter)) {
        targetFolder = path.join(dataDir, pair);
        break;
      }
    }

    if (!targetFolder) {
      return logger.error(
        `No folder found for courses starting with '${firstLetter}'.`
      );
    }

    if (!fs.existsSync(targetFolder)) {
      return logger.error(`The folder ${targetFolder} does not exist.`);
    }

    // Expect only one .cru file in the folder
    const cruFile = fs
      .readdirSync(targetFolder)
      .find((file) => file.endsWith(".cru"));

    if (!cruFile) {
      return logger.info(`No .cru file found in folder ${targetFolder}.`);
    }

    const filePath = path.join(targetFolder, cruFile);

    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        return logger.warn(`Error reading file ${cruFile}: ${err.message}`);
      }

      const parser = new CruParser(false, false); // Disable tokenization and symbol logging for this command
      parser.parse(data);

      let found = false;

      parser.parsedData.forEach((edt) => {
        if (edt.name === courseName) {
          const listRoom = new Set();
          edt.sessions.forEach((session) => {
            if (!listRoom.has(session[5])) {
              listRoom.add(session[5]);
              found = true;
              logger.info(`Course: ${session.name}`);
              logger.info(`Room: ${session.room}`);
              logger.info(`Capacity: ${session.capacity}`);
            }
          });
        }
      });

      if (!found) {
        logger.info(`Course ${courseName} not found in ${filePath}.`);
      }
    });
  })

  // Check for available rooms in the given time slot
  .command("getAvailableRooms", "Get available rooms for a given time slot")
  .argument("<hours>", "The time slot to check for available rooms")
  .action(({ args, logger }) => {
    const hours = args.hours;
    const dataDir = "data";

    // Check if the time slot is in the correct format
    const hoursRegex = /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/;
    if (!hoursRegex.test(hours)) {
      return logger.error(
        "SRUPC_2_E1: Invalid time slot format. Expected format: HH:MM-HH:MM"
      );
    }

    // Get all .cru files in the data directory and its subdirectories
    const files = findCruFiles(dataDir);

    // Check if there are any .cru files in the directory
    if (files.length === 0) {
      return logger.info("No .cru files found in the data directory.");
    }

    const availableRooms = new Set();

    //process each .cru file
    files.forEach((filePath) => {
      logger.info(`Processing file: ${filePath}`);

      const parser = new CruParser(false, false);
      parser.parse(fs.readFileSync(filePath, "utf8"));

      const rooms = parser.availableRooms(hours);
      rooms.forEach((room) => availableRooms.add(room));
    });

    if (availableRooms.size === 0) {
      logger.info("No available rooms found for the given time slot.");
    } else {
      logger.info("Available rooms : ");
      availableRooms.forEach((room) => {
        if (room) {
          logger.info(room);
        }
      });
    }
  })

  .command("getRoomAvailability", "Check the availability of a room")
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
