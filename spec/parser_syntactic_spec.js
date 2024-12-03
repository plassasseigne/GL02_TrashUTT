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
});
