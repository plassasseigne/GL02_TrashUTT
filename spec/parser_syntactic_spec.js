//TODO

const EDT = require("../edt");
const Session = require("../Session");

describe("Program Semantic testing of EDT", function () {
  beforeEach(function () {
    const EDT = require("../edt");
    const Session = require("../Session");
    const CruParser = require("../CruParser");

    this.analyzer = new CruParser();
  });

  it("can read a session with his description", function () {
    const session2 = "1,C1,P=39,H=J 14:00-16:00,F1,S=A001//";
    const objSession2 = new Session(
      "1",
      "C1",
      "39",
      "J 14:00-16:00",
      "F1",
      "A001"
    );
    expect(this.analyzer.session(session2)).toEqual(objSession2);
  });
  it("can read an EDT with his description", function () {
    var edt =
      "+CL02\n1,C1,P=39,H=J 14:00-16:00,F1,S=A001//\n1,D1,P=24,H=ME 16:00-18:00,F1,S=S104//";

    const session1 = new Session(
      "1",
      "C1",
      "39",
      "J 14:00-16:00",
      "F1",
      "A001"
    );
    const session2 = new Session(
      "1",
      "D1",
      "24",
      "ME 16:00-18:00",
      "F1",
      "S104"
    );

    const objEdt = new EDT("CL02", [session1, session2]);

    const parsedEdt = this.analyzer.listEdt(edt);
    expect(parsedEdt).toEqual(objEdt);
  });
  it("can detect a session which have an invalid session type", function () {
    const sessionType = "Z1";
    expect(this.analyzer.sessionType(sessionType)).toBe("Invalid session type");
  });
  it("can detect an invalid time", function () {
    const time1 = "H=ZA 16:00-18:00";
    const time2 = "H=MA 26:00-18:00";
    expect(this.analyzer.time(time1)).toBe("Invalid day");
    expect(this.analyzer.time(time2)).toBe("Invalid time range");
  });

  it("can find the available rooms for a given time slot", function () {
    const timeSlot = "14:00-16:00";
    const edtData = `
      +CL02
      1,C1,P=39,H=J 14:00-16:00,F1,S=A001//
      1,D1,P=24,H=ME 16:00-18:00,F1,S=S104//
      +CL03
      1,C1,P=39,H=J 10:00-12:00,F1,S=A002//
      1,D1,P=24,H=ME 14:00-16:00,F1,S=S105//
    `;

    this.analyzer.listEdt(edtData);
    const availableRooms = this.analyzer.availableRooms(timeSlot);

    expect(availableRooms).toEqual({
      L: [],
      MA: [],
      ME: ["S104"],
      J: ["A002"],
      V: [],
      S: [],
      D: [],
    });
  });

  it("can detect an invalid time format when finding available rooms", function () {
    const timeSlot = "124:00-26:00";
    const edtData = `
      +CL02
      1,C1,P=39,H=J 14:00-16:00,F1,S=A001//
      1,D1,P=24,H=ME 16:00-18:00,F1,S=S104//
      +CL03
      1,C1,P=39,H=J 10:00-12:00,F1,S=A002//
      1,D1,P=24,H=ME 14:00-16:00,F1,S=S105//
    `;

    this.analyzer.listEdt(edtData);

    expect(() => this.analyzer.availableRooms(timeSlot)).toThrow(
      new Error(
        "SRUPC_2_E1: Invalid time slot format. Expected format: HH:MM-HH:MM"
      )
    );
  });

  it("can check the availability of a room", function () {
    const room = "A001";
    const edtData = `
      +CL02
      1,C1,P=39,H=J 14:00-16:00,F1,S=A001//
      1,D1,P=24,H=ME 16:00-18:00,F1,S=S104//
      +CL03
      1,C1,P=39,H=J 10:00-12:00,F1,S=A002//
      1,D1,P=24,H=ME 14:00-16:00,F1,S=S105//
    `;

    this.analyzer.listEdt(edtData);
    const roomAvailability = this.analyzer.getRoomAvailability(room);

    expect(roomAvailability).toEqual({
      L: [{ start: "08:00", end: "20:00" }],
      MA: [{ start: "08:00", end: "20:00" }],
      ME: [{ start: "08:00", end: "20:00" }],
      J: [
        { start: "08:00", end: "14:00" },
        { start: "16:00", end: "20:00" },
      ],
      V: [{ start: "08:00", end: "20:00" }],
      S: [{ start: "08:00", end: "20:00" }],
      D: [{ start: "08:00", end: "20:00" }],
    });
  });

  it("can detect an invalid room format when checking room availability", function () {
    const room = "A0011";
    const edtData = `
      +CL02
      1,C1,P=39,H=J 14:00-16:00,F1,S=A001//
      1,D1,P=24,H=ME 16:00-18:00,F1,S=S104//
      +CL03
      1,C1,P=39,H=J 10:00-12:00,F1,S=A002//
      1,D1,P=24,H=ME 14:00-16:00,F1,S=S105//
    `;

    this.analyzer.listEdt(edtData);

    expect(() => this.analyzer.getRoomAvailability(room)).toThrow(
      new Error("SRUPC_3_E1: Invalid room format. Expected format: ABC123")
    );
  });
});
