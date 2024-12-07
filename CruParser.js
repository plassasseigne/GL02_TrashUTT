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
  return input.split("=")[1].replace("//", "");
};

// Récupérer les salles disponibles pour une plage horaire donnée
CruParser.prototype.getAvailableRooms = function (hours) {
  const [start, end] = hours.split("-");
  const availableRooms = [];

  this.parsedData.forEach((edt) => {
    edt.sessions.forEach((session) => {
      const sessionTime = session[3];
      const [sessionStart, sessionEnd] = sessionTime.split("-");
      if (end <= sessionStart || start >= sessionEnd) {
        availableRooms.push(session[5]); // Ajouter la salle si elle est disponible
      }
    });
  });

  return [...new Set(availableRooms)]; // Supprimer les doublons
};

CruParser.prototype.getRoomAvailability = function (room) {
  const availability = [];

  this.parsedData.forEach((edt) => {
    edt.sessions.forEach((session) => {
      if (session[5] === room) {
        availability.push(session[3]); // Ajouter le créneau horaire si la salle correspond
      }
    });
  });

  return availability;
};

module.exports = CruParser;
