"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u4TokenAdmin,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new job",
    companyHandle: "e1"
  };
  const badJob = {
    title: "new job",
    companyHandle: "12345678901234567892123456",
    salary: "$100000",
    equity: 1.2
  };

  test("ok for admin, minimal fields", async function () {
    let resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: newJob.title,
        salary: null,
        equity: null,
        companyHandle: newJob.companyHandle
      }
    });
    // db_verification
    resp = await request(app)
      .get("/jobs/e1")
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      jobs: [
        {
          companyHandle: "e1",
          name: "E1",
          numEmployees: 5,
          jobs: [
            {
              id: expect.any(Number),
              title: newJob.title,
              salary: null,
              equity: null
            }
          ]
        }
      ]
    });

  });

  test("ok for admin, all fields", async function () {
    newJob.salary = 85000;
    newJob.equity = 0.5;
    let resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: newJob.title,
        salary: newJob.salary,
        equity: newJob.equity,
        companyHandle: newJob.companyHandle
      }
    });

    // db_verification
    resp = await request(app)
      .get("/jobs/e1")
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      jobs: [
        {
          companyHandle: "e1",
          name: "E1",
          numEmployees: 5,
          jobs: [
            {
              id: expect.any(Number),
              title: newJob.title,
              salary: newJob.salary,
              equity: newJob.equity
            }
          ]
        }
      ]
    });
  });

  test("error for admin, company not found", async function () {
    newJob.salary = 85000;
    newJob.equity = 0.5;
    newJob.companyHandle = "f1"
    let resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(resp.statusCode).toEqual(404);
    expect(resp.body.error.message).toEqual(
      "Job NOT created: companyHandle 'f1' does not exist");
  });

  test("error for admin, invalid fields", async function () {
    let resp = await request(app)
      .post("/jobs")
      .send(badJob)
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message).toEqual([
      "instance.salary is not of a type(s) integer",
      "instance.equity must be less than or equal to 1",
      "instance.companyHandle does not meet maximum length of 25"
    ]);
  });

  test("fail for non-admin, all fields", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body.error.message).toEqual("Unauthorized");
  });

  // NOTE: bad data not tested for non-admin and not logged in because 
  //  data validations occur after ensureAdmin.
  test("fail for anonymous, all fields", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body.error.message).toEqual("Unauthorized");
  });

});


/************************************** GET /jobs */

describe("GET /jobs", function () {
  const allJobs = {
    jobs: [
      {
        "companyHandle": "c1",
        "name": "C1",
        "numEmployees": 1,
        "jobs": [
          {
            "id": expect.any(Number),
            "title": "j1-c1",
            "salary": 10000,
            "equity": 0
          },
          {
            "id": expect.any(Number),
            "title": "j2-c1",
            "salary": 20000,
            "equity": null
          },
          {
            "id": expect.any(Number),
            "title": "j3-c1",
            "salary": 30000,
            "equity": 0.02
          },
          {
            "id": expect.any(Number),
            "title": "j4-c1",
            "salary": 40000,
            "equity": null
          },
          {
            "id": expect.any(Number),
            "title": "j5-c1",
            "salary": null,
            "equity": null
          }
        ]
      },
      {
        "companyHandle": "d1",
        "name": "D1",
        "numEmployees": 4,
        "jobs": [
          {
            "id": expect.any(Number),
            "title": "j1-d1",
            "salary": 35000,
            "equity": 0.01
          }
        ]
      }
    ],
  }
  test("ok for anonymous", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual(allJobs);
  });

  test("ok for non-admin", async function () {
    const resp = await request(app)
      .get("/jobs")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual(allJobs);
  });

  test("ok for admin", async function () {
    const resp = await request(app)
      .get("/jobs")
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(resp.body).toEqual(allJobs);
  });

});


/************************************** GET /jobs  with filters*/

describe("GET /jobs", function () {
  const allJobs = {
    jobs: [
      {
        "companyHandle": "c1",
        "name": "C1",
        "numEmployees": 1,
        "jobs": [
          {
            "id": expect.any(Number),
            "title": "j1-c1",
            "salary": 10000,
            "equity": 0
          },
          {
            "id": expect.any(Number),
            "title": "j2-c1",
            "salary": 20000,
            "equity": null
          },
          {
            "id": expect.any(Number),
            "title": "j3-c1",
            "salary": 30000,
            "equity": 0.02
          },
          {
            "id": expect.any(Number),
            "title": "j4-c1",
            "salary": 40000,
            "equity": null
          },
          {
            "id": expect.any(Number),
            "title": "j5-c1",
            "salary": null,
            "equity": null
          }
        ]
      },
      {
        "companyHandle": "d1",
        "name": "D1",
        "numEmployees": 4,
        "jobs": [
          {
            "id": expect.any(Number),
            "title": "j1-d1",
            "salary": 35000,
            "equity": 0.01
          }
        ]
      }
    ],
  }

  test("ok for anonymous, filter title like j1", async function () {
    const resp = await request(app).get("/jobs?title=j1");
    expect(resp.body).toEqual({
      jobs: [
        {
          "companyHandle": "c1",
          "name": "C1",
          "numEmployees": 1,
          "jobs": [
            {
              "id": expect.any(Number),
              "title": "j1-c1",
              "salary": 10000,
              "equity": 0
            }
          ]
        },
        {
          "companyHandle": "d1",
          "name": "D1",
          "numEmployees": 4,
          "jobs": [
            {
              "id": expect.any(Number),
              "title": "j1-d1",
              "salary": 35000,
              "equity": 0.01
            }
          ]
        }
      ],
    });
  });

  test("ok for anonymous, filter minSalary=30000", async function () {
    const resp = await request(app).get("/jobs?minSalary=30000");
    expect(resp.body).toEqual({
      jobs: [
        {
          "companyHandle": "c1",
          "name": "C1",
          "numEmployees": 1,
          "jobs": [
            {
              "id": expect.any(Number),
              "title": "j3-c1",
              "salary": 30000,
              "equity": 0.02
            },
            {
              "id": expect.any(Number),
              "title": "j4-c1",
              "salary": 40000,
              "equity": null
            }
          ]
        },
        {
          "companyHandle": "d1",
          "name": "D1",
          "numEmployees": 4,
          "jobs": [
            {
              "id": expect.any(Number),
              "title": "j1-d1",
              "salary": 35000,
              "equity": 0.01
            }
          ]
        }
      ],
    });
  });

  test("ok for anonymous, filter hasEquity is true", async function () {
    const resp = await request(app).get("/jobs?hasEquity=true");
    expect(resp.body).toEqual({
      jobs: [
        {
          "companyHandle": "c1",
          "name": "C1",
          "numEmployees": 1,
          "jobs": [
            {
              "id": expect.any(Number),
              "title": "j3-c1",
              "salary": 30000,
              "equity": 0.02
            }
          ]
        },
        {
          "companyHandle": "d1",
          "name": "D1",
          "numEmployees": 4,
          "jobs": [
            {
              "id": expect.any(Number),
              "title": "j1-d1",
              "salary": 35000,
              "equity": 0.01
            }
          ]
        }
      ],
    });
  });

  test("ok for anonymous, filter hasEquity is false", async function () {
    const resp = await request(app).get("/jobs?hasEquity=false");
    expect(resp.body).toEqual(allJobs);
  });

  test("ok for anonymous, title, minSalary, and equity filters", async function () {
    const resp = await request(app).get("/jobs?title=c1&minSalary=30000&hasEquity=true");
    expect(resp.body).toEqual({
      jobs: [
        {
          "companyHandle": "c1",
          "name": "C1",
          "numEmployees": 1,
          "jobs": [
            {
              "id": expect.any(Number),
              "title": "j3-c1",
              "salary": 30000,
              "equity": 0.02
            }
          ]
        }
      ],
    });
  });

  test("ok for anonymous, filters results in no data", async function () {
    const resp = await request(app).get("/jobs?title=z1&minSalary=120000&hasEquity=true");
    expect(resp.body).toEqual({
      jobs: []
    });
  });

  test("ok for anonymous, filters invalid", async function () {
    const resp = await request(app).get("/jobs?maxSalary=90000&");
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message).toEqual(
      ["instance is not allowed to have the additional property \"maxSalary\""]
    );
  });

});

