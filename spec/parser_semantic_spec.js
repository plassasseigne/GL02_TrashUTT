const EDT = require("../edt");
const Session = require("../Session"); // Assuming Session is in a separate file

describe("Program Semantic testing of EDT", function () {
  beforeEach(function () {
    // Create a sample session for testing
    const session1 = new Session(1, "C1", 25, "V 10:00-11:30", "F1", "B012");

    this.edt = new EDT("SPO4", [session1]);
  });

  it("can create a new EDT", function () {
    expect(this.edt).toBeDefined();
    expect(this.edt.name).toBe("SPO4");
    expect(this.edt.sessions.length).toBe(1); // Check initial session count
  });

  it("can add a new session", function () {
    const session2 = new Session(2, "TD", 15, "14:00-15:30", "B", "B005");

    this.edt.sessions.push(session2);

    expect(this.edt.sessions.length).toBe(2); // Check session count after adding
    expect(this.edt.sessions[1]).toEqual(session2); // Deep equality check for new session
  });
});
