const EDT = require("./edt"); // Assurez-vous d'importer EDT ici
const Session = require("./Session");

var CruParser = function (sTokenize, sParsedSymb) {
  this.parsedData = []; // Liste des sessions analysées
  this.showTokenize = sTokenize;
  this.showParsedSymbols = sParsedSymb;
  this.errorCount = 0;
};

// Tokenize : transforme les données d'entrée en liste
CruParser.prototype.tokenize = function (data) {
  // Diviser les données en lignes
  var separator = /(\r\n|: )/;
  data = data.split(separator);
  data = data.filter((val, idx) => !val.match(separator));

  filteredData = data.filter((line) => {
    // Ignore les lignes parasites
    return (
      line.trim() !== "" &&
      !line.includes("Page") &&
      !line.startsWith("+UVUV") &&
      !line.startsWith("Seance") &&
      !line.endsWith("sec")
    );
  });
  return filteredData;
};

// Parse : analyse les données en appelant la première règle non terminale
CruParser.prototype.parse = function (data) {
  var tData = this.tokenize(data);
  if (this.showTokenize) {
    console.log(tData);
  }
  this.listEdt(tData);
};

// Analyse la liste des sessions
CruParser.prototype.listEdt = function (input) {
  // Si l'entrée est une chaîne, on la divise en un tableau
  if (typeof input === "string") {
    input = input.split("\n").map((line) => line.trim()); // Supprimer les espaces superflus
  }

  var currentEDT;
  while (input.length > 0) {
    var line = input.shift();

    if (line.startsWith("+")) {
      // Si c'est un nouvel EDT
      if (currentEDT) {
        this.parsedData.push(currentEDT); // Ajouter l'EDT précédent
      }
      currentEDT = new EDT(line.substring(1), []); // Créer une nouvelle instance d'EDT
    } else if (line) {
      // Si c'est une session
      if (currentEDT) {
        currentEDT.sessions.push(this.session(line));
      }
    }
  }
  if (currentEDT) {
    this.parsedData.push(currentEDT);
  }

  return this.parsedData[0]; // Retourner uniquement le premier EDT
};

// Analyse une activité dans le format "X,X,P=X,H=X X:XX-X:XX,XX,S=XXX//"
CruParser.prototype.session = function (input) {
  var parts = input.split(",");
  let session = new Session(
    this.id(parts[0]),
    this.sessionType(parts[1]),
    this.capacity(parts[2]),
    this.time(parts[3]),
    this.subgroup(parts[4]),
    this.room(parts[5])
  );
  return session;
};
CruParser.prototype.id = function (input) {
  return input;
};
CruParser.prototype.sessionType = function (input) {
  const typeList = ["C", "T", "D"];
  if (typeList.includes(input[0])) {
    return input;
  }
  return "Invalid session type";
};
CruParser.prototype.capacity = function (input) {
  return input.split("=")[1];
};
CruParser.prototype.time = function (input) {
  const dayList = ["L", "MA", "ME", "J", "V", "S", "D"];
  const regex = /^([A-Z]+) (\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/;

  input = input.split("=")[1];
  const match = input.match(regex);

  const day = match[1];
  const startTime = match[2];
  const endTime = match[3];

  // Vérifier si le jour est valide
  if (!dayList.includes(day)) {
    return "Invalid day";
  }

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  if (
    startHour < 0 ||
    startHour > 24 ||
    endHour < 0 ||
    endHour > 24 ||
    startMinute < 0 ||
    startMinute >= 60 ||
    endMinute < 0 ||
    endMinute >= 60
  ) {
    return "Invalid time range";
  }
  return input;
};

CruParser.prototype.subgroup = function (input) {
  return input;
};
CruParser.prototype.room = function (input) {
  const index = input.indexOf("S=");
  if (index !== -1 && input.length >= index + 6) {
    return input.substring(index + 2, index + 6);
  }
  return null;
};

// Récupérer les salles disponibles pour une plage horaire donnée
CruParser.prototype.availableRooms = function (hours) {
  const hoursRegex = /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/;
  if (!hoursRegex.test(hours)) {
    throw new Error(
      "SRUPC_2_E1: Invalid time slot format. Expected format: HH:MM-HH:MM"
    );
  }

  const [start, end] = hours.split("-").map((time) => time.replace(":", ""));
  const daysOfWeek = ["L", "MA", "ME", "J", "V", "S", "D"];
  const availableRooms = {};
  daysOfWeek.forEach((day) => {
    availableRooms[day] = [];
  });

  this.parsedData.forEach((edt) => {
    edt.sessions.forEach((session) => {
      const [day, time] = session.time.split(" ");
      const [sessionStart, sessionEnd] = time
        .split("-")
        .map((time) => time.replace(":", ""));
      if (
        (end <= sessionStart || start >= sessionEnd) &&
        daysOfWeek.includes(day) &&
        !availableRooms[day].includes(session.room)
      ) {
        availableRooms[day].push(session.room);
      }
    });
  });

  return availableRooms;
};

// Récupérer la disponibilité d'une salle donnée
CruParser.prototype.getRoomAvailability = function (room) {
  // Check if the room name is in the correct format
  const roomRegex = /^[A-Z]{1}\d{3}$/;
  if (!roomRegex.test(room)) {
    throw new Error("SRUPC_3_E1: Invalid room format. Expected format: ABC123");
  }
  const sessions = this.parsedData.flatMap((edt) => edt.sessions);
  const startHour = "08:00";
  const endHour = "20:00";
  const daysOfWeek = ["L", "MA", "ME", "J", "V", "S", "D"];
  const availability = {};

  // Initialize availability for each day of the week
  daysOfWeek.forEach((day) => {
    availability[day] = [{ start: startHour, end: endHour }];
  });

  // Iterate through sessions and adjust availability
  sessions.forEach((session) => {
    if (session.room === room) {
      const [day, time] = session.time.split(" ");
      const [sessionStart, sessionEnd] = time.split("-");

      if (availability[day]) {
        let newAvailability = [];

        availability[day].forEach((slot) => {
          if (sessionStart >= slot.end || sessionEnd <= slot.start) {
            // No overlap
            newAvailability.push(slot);
          } else {
            // Overlap exists, split the slot if necessary
            if (sessionStart > slot.start) {
              newAvailability.push({ start: slot.start, end: sessionStart });
            }
            if (sessionEnd < slot.end) {
              newAvailability.push({ start: sessionEnd, end: slot.end });
            }
          }
        });

        availability[day] = newAvailability;
      }
    }
  });

  return availability;
};

module.exports = CruParser;
