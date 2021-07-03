"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");
const User = require("../models/user");

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

// ************************************** POST /companies 

describe("POST /companies", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    logoUrl: "http://new.img",
    description: "DescNew",
    numEmployees: 10,
  };

  test("ok for admin", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      company: newCompany,
    });
  });

  test("bad request from admin with missing data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        handle: "new",
        numEmployees: 10,
      })
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request from admin with invalid data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        ...newCompany,
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("not ok for anon", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body.error.message).toEqual("Unauthorized");
  });

  test("not ok for non-admin", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body.error.message).toEqual("Unauthorized");
  });

  test("bad request from non-admin with missing data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        handle: "new",
        numEmployees: 10,
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body.error.message).toEqual("Unauthorized");
  });

  test("bad request from non-admin with invalid data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        ...newCompany,
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body.error.message).toEqual("Unauthorized");
  });

});


// ************************************** GET /companies 

describe("GET /companies", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/companies");
    expect(resp.body).toEqual({
      companies:
        [
          {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img"
          },
          {
            handle: "c2",
            name: "C2",
            description: "Desc2",
            numEmployees: 2,
            logoUrl: "http://c2.img"
          },
          {
            handle: "c3",
            name: "C3",
            description: "Desc3",
            numEmployees: 3,
            logoUrl: "http://c3.img"
          },
          {
            handle: "d1",
            name: "D1",
            description: "Desc d1",
            numEmployees: 4,
            logoUrl: "http://d1.img"
          },
          {
            handle: "e1",
            name: "E1",
            description: "Desc e1",
            numEmployees: 5,
            logoUrl: "http://e1.img"
          }
        ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE companies CASCADE");
    const resp = await request(app)
      .get("/companies")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});


// ************************************** GET /companies  with filters

describe("GET /companies with filters", function () {
  test("ok for anon - filter test", async function () {
    let resp = await request(app).get("/companies?nameLike=1");
    expect(resp.body).toEqual({
      companies:
        [
          {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img"
          },
          {
            handle: "d1",
            name: "D1",
            description: "Desc d1",
            numEmployees: 4,
            logoUrl: "http://d1.img"
          },
          {
            handle: "e1",
            name: "E1",
            description: "Desc e1",
            numEmployees: 5,
            logoUrl: "http://e1.img"
          }
        ],
    });

    // name filter
    resp = await request(app).get("/companies?nameLike=d");
    expect(resp.body).toEqual({
      companies:
        [
          {
            handle: "d1",
            name: "D1",
            description: "Desc d1",
            numEmployees: 4,
            logoUrl: "http://d1.img"
          }
        ],
    });

    // min filter
    resp = await request(app).get("/companies?minEmployees=5");
    expect(resp.body).toEqual({
      companies:
        [
          {
            handle: "e1",
            name: "E1",
            description: "Desc e1",
            numEmployees: 5,
            logoUrl: "http://e1.img"
          }
        ],
    });

    // max filter
    resp = await request(app).get("/companies?maxEmployees=2");
    expect(resp.body).toEqual({
      companies:
        [
          {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img"
          },
          {
            handle: "c2",
            name: "C2",
            description: "Desc2",
            numEmployees: 2,
            logoUrl: "http://c2.img"
          }
        ],
    });

    // both min and max
    resp = await request(app).get("/companies?minEmployees=2&maxEmployees=4");
    expect(resp.body).toEqual({
      companies:
        [
          {
            handle: "c2",
            name: "C2",
            description: "Desc2",
            numEmployees: 2,
            logoUrl: "http://c2.img"
          },
          {
            handle: "c3",
            name: "C3",
            description: "Desc3",
            numEmployees: 3,
            logoUrl: "http://c3.img"
          },
          {
            handle: "d1",
            name: "D1",
            description: "Desc d1",
            numEmployees: 4,
            logoUrl: "http://d1.img"
          }
        ],
    });

    // all filters
    resp = await request(app).get("/companies?minEmployees=2&maxEmployees=4&nameLike=d");
    expect(resp.body).toEqual({
      companies:
        [
          {
            handle: "d1",
            name: "D1",
            description: "Desc d1",
            numEmployees: 4,
            logoUrl: "http://d1.img"
          }
        ],
    });

  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE companies CASCADE");
    const resp = await request(app)
      .get("/companies")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

describe("GET /companies with invalid filters", function () {
  // invalid filter keyword
  test("ok for anon - filter error test - invalid keyword", async function () {
    let resp = await request(app).get("/companies?name=1");
    expect(resp.status).toEqual(400);
    expect(resp.body.error.message).toEqual([
      "instance is not allowed to have the additional property \"name\""
    ]);

    // invalid filter value
    resp = await request(app).get("/companies?minEmployees=1o");
    expect(resp.status).toEqual(400);
    expect(resp.body.error.message).toEqual([
      "instance.minEmployees does not match pattern \"^[0-9]*$\""
    ]);

    // invalid filter value
    resp = await request(app).get("/companies?minEmployees=10&maxEmployees=5");
    expect(resp.status).toEqual(400);
    expect(resp.body.error.message).toEqual(
      "Filter is incorrect: 'minEmployees', 10, is NOT less than 'maxEmployees', 5."
    );

  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE companies CASCADE");
    const resp = await request(app)
      .get("/companies")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});


// ************************************** GET /companies/:handle 

describe("GET /companies/:handle", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/companies/c1`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
        jobs: [
          {
            equity: 0,
            id: expect.any(Number),
            salary: 10000,
            title: "j1-c1",
          },
          {
            equity: null,
            id: expect.any(Number),
            salary: 20000,
            title: "j2-c1",
          },
          {
            equity: 0.02,
            id: expect.any(Number),
            salary: 30000,
            title: "j3-c1",
          },
          {
            equity: null,
            id: expect.any(Number),
            salary: 40000,
            title: "j4-c1",
          },
          {
            equity: null,
            id: expect.any(Number),
            salary: null,
            title: "j5-c1",
          },
        ]
      },
    });
  });

  test("works for anon: company w/o jobs", async function () {
    const resp = await request(app).get(`/companies/c2`);
    expect(resp.body).toEqual({
      company: {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
        jobs: []
      },
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/companies/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});




describe("GET /jobs/:handle -- get jobs for a company", function () {
  const c1Jobs = {
    "handle": "c1",
    "name": "C1",
    "description": "Desc1",
    "numEmployees": 1,
    "logoUrl": "http://c1.img",
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
  };

  test("jobs for a company ok for anonymous", async function () {
    const resp = await request(app).get("/companies/c1");
    expect(resp.body).toEqual({ company: c1Jobs });
  });

  test("company not found for anonymous", async function () {
    const handle = "f14"
    const resp = await request(app)
      .get(`/companies/${handle}`);
    expect(resp.statusCode).toEqual(404);
    expect(resp.body.error.message).toEqual(`No company: ${handle}`);
  });

});



// ************************************* GET /jobs/:handle plus filters

describe("GET /jobs/:handle -- get filtered jobs for a company", function () {
  const c1Jobs = {
    "handle": "c1",
    "name": "C1",
    "description": "Desc1",
    "numEmployees": 1,
    "logoUrl": "http://c1.img",
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
  };

  test("filtered jobs (title=j2) for a company ok for anonymous", async function () {
    const resp = await request(app).get("/companies/c1?title=j2");
    expect(resp.body).toEqual({
      company: {
        "handle": "c1",
        "name": "C1",
        "description": "Desc1",
        "numEmployees": 1,
        "logoUrl": "http://c1.img",
        "jobs": [
          {
            "id": expect.any(Number),
            "title": "j2-c1",
            "salary": 20000,
            "equity": null
          }
        ]
      }
    });
  });

  test("filtered jobs (minSalary=25000) for a company ok for anonymous", async function () {
    const resp = await request(app).get("/companies/c1?minSalary=25000");
    expect(resp.body).toEqual({
      company: {
        "handle": "c1",
        "name": "C1",
        "description": "Desc1",
        "numEmployees": 1,
        "logoUrl": "http://c1.img",
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
      }
    });
  });

  test("filtered jobs (hasEquity=true) for a company ok for anonymous", async function () {
    const resp = await request(app).get("/companies/c1?hasEquity=true");
    expect(resp.body).toEqual({
      company: {
        "handle": "c1",
        "name": "C1",
        "description": "Desc1",
        "numEmployees": 1,
        "logoUrl": "http://c1.img",
        "jobs": [
          {
            "id": expect.any(Number),
            "title": "j3-c1",
            "salary": 30000,
            "equity": 0.02
          }
        ]
      }
    });
  });

  test("filtered jobs (hasEquity=false) for a company ok for anonymous", async function () {
    const resp = await request(app).get("/companies/c1?hasEquity=false");
    expect(resp.body).toEqual({ company: c1Jobs });
  });

  test("filtered jobs (all filters) for a company ok for anonymous", async function () {
    const resp = await request(app).get("/companies/c1?title=j&minSalary=30000&hasEquity=true");
    expect(resp.body).toEqual({
      company: {
        "handle": "c1",
        "name": "C1",
        "description": "Desc1",
        "numEmployees": 1,
        "logoUrl": "http://c1.img",
        "jobs": [
          {
            "id": expect.any(Number),
            "title": "j3-c1",
            "salary": 30000,
            "equity": 0.02
          }
        ]
      }
    });
  });

  test("filtered job list is empty", async function () {
    const resp = await request(app).get("/companies/c1?title=x");
    expect(resp.body).toEqual({
      company: {
        "handle": "c1",
        "name": "C1",
        "description": "Desc1",
        "numEmployees": 1,
        "logoUrl": "http://c1.img",
        "jobs": []
      }
    });
  });

  test("company not found for anonymous", async function () {
    const handle = "f14"
    const resp = await request(app)
      .get(`/companies/${handle}`);
    expect(resp.statusCode).toEqual(404);
    expect(resp.body.error.message).toEqual(`No company: ${handle}`);
  });

});


// ************************************** PATCH /companies/:handle

describe("PATCH /companies/:handle", function () {

  test("works for admin", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1-new",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on admin request for no such company", async function () {
    const resp = await request(app)
      .patch(`/companies/nope`)
      .send({
        name: "new nope",
      })
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request from admin on handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        handle: "c1-new",
      })
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with on invalid data from admin", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("fails for non-admin users", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body.error.message).toEqual("Unauthorized");
  });

  test("fails for non-admin not found on no such company", async function () {
    const resp = await request(app)
      .patch(`/companies/nope`)
      .send({
        name: "new nope",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body.error.message).toEqual("Unauthorized");
  });

  test("fails for non-admin bad request on handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        handle: "c1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body.error.message).toEqual("Unauthorized");
  });

  test("fails for non-admin bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body.error.message).toEqual("Unauthorized");
  });

});

// ************************************** DELETE /companies/:handle

describe("DELETE /companies/:handle with cascade delete checks", function () {

  test("works for admin users", async function () {
    // user 3 applies for a job. This will verifiy cascade deletes.
    let resultJobId = await db.query(`
      SELECT id FROM jobs WHERE title ='j4-c1' `);
    expect(resultJobId.rows[0].id).toEqual(expect.any(Number));
    let resultApply = await User.applyForJob({ username: "u3", id: resultJobId.rows[0].id });
    expect(resultApply.job_id).toEqual(resultJobId.rows[0].id);

    // verify the job application
    const appBefore = await request(app)
      .get("/users/u3")
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(appBefore.body).toEqual({
      "user": {
        "username": "u3",
        "firstName": "U3F",
        "lastName": "U3L",
        "email": "user3@user.com",
        "isAdmin": false,
        "jobs": [resultJobId.rows[0].id]
      }
    });

    // verify all jobs
    let resp = await request(app)
      .get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
        {
          "handle": "c1",
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
          "handle": "d1",
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

    resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(resp.body).toEqual({ deleted: "c1" });

    // verify company delete
    resp = await request(app)
      .get(`/companies/c1`);
    expect(resp.statusCode).toEqual(404);
    expect(resp.body.error.message).toEqual("No company: c1");

    // verify job delete
    resp = await request(app)
      .get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
        {
          "handle": "d1",
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

    // verify no job application
    resp = await request(app)
      .get("/users/u3")
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(resp.body).toEqual({
      "user": {
        "username": "u3",
        "firstName": "U3F",
        "lastName": "U3L",
        "email": "user3@user.com",
        "isAdmin": false
      }
    });

  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company for admin user", async function () {
    const resp = await request(app)
      .delete(`/companies/nope`)
      .set("authorization", `Bearer ${u4TokenAdmin}`);
    expect(resp.statusCode).toEqual(404);
  });


  test("fails for non-admin users", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("fails for non-admin user - not found for no such company", async function () {
    const resp = await request(app)
      .delete(`/companies/nope`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

});

