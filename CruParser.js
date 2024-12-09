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
  var currentEDT;
  while (input.length > 0) {
    var line = input.shift();

    if (line.startsWith("+")) {
      // Si c'est un nouvel EDT (ligne commence par "+")
      if (currentEDT) {
        this.parsedData.push(currentEDT); // Ajouter l'edt précédent à la liste
      }
      // Commencer une nouvelle session
      currentEDT = new EDT(line.substring(1), []); // Créer une nouvelle instance EDT
    } else {
      // Sinon, analyser les activités de l'EDT courant
      if (currentEDT) {
        currentEDT.sessions.push(this.session(line)); // Ajouter la session à la liste de session
      }
    }
  }
  if (currentEDT) {
    this.parsedData.push(currentEDT);
  }
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
  return input;
};
CruParser.prototype.capacity = function (input) {
  return input.split("=")[1];
};
CruParser.prototype.time = function (input) {
  return input.split("=")[1];
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

  const [start, end] = hours.split("-");
  const availableRooms = [];

  this.parsedData.forEach((edt) => {
    edt.sessions.forEach((session) => {
      const [sessionStart, sessionEnd] = session.time.split("-");
      if (
        (end <= sessionStart || start >= sessionEnd) &&
        session.capacity !== "0" &&
        !availableRooms.includes(session.room)
      ) {
        availableRooms.push(session.room);
      }
    });
  });

  console.log([...new Set(availableRooms)]);

  return [...new Set(availableRooms)]; // Supprimer les doublons
};

// Récupérer la disponibilité d'une salle donnée
CruParser.prototype.getRoomAvailability = function (room) {
  const sessions = this.parsedData.flatMap((edt) => edt.sessions); // Assuming sessions are stored in this.parsedData
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
