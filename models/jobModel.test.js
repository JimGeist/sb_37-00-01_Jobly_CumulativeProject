"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./jobModel.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);


/************************************** create */

describe("create", function () {
  const newJob = {
    title: "new",
    salary: 75000,
    equity: "0",
    companyHandle: "e1"
  };

  test("no error - add new job", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual(
      {
        "companyHandle": "e1",
        "equity": 0,
        "id": expect.any(Number),
        "salary": 75000,
        "title": "new"
      }
    );

    // verification, id is NOT selected.
    const result = await db.query(
      `SELECT company_handle AS "companyHandle", title, salary, equity
        FROM jobs
        WHERE title = 'new'`);
    expect(result.rows[0]).toEqual(newJob);
  });

  test("bad request - invalid company for job", async function () {
    newJob.companyHandle = "f1";
    try {
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err.message).toEqual(
        "insert or update on table \"jobs\" violates foreign key constraint \"jobs_company_handle_fkey\""
      );
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: descending salary no filter", async function () {
    let jobs = await Job.findAll("", "", {});
    expect(jobs).toEqual(
      [
        {
          "handle": "c1",
          "name": "C1",
          "numEmployees": 1,
          "jobs": [
            {
              "equity": null,
              "id": expect.any(Number),
              "salary": 50000,
              "title": "one"
            },
            {
              "equity": 0.06,
              "id": expect.any(Number),
              "salary": 60000,
              "title": "onetwo"
            },
            {
              "equity": 0.07,
              "id": expect.any(Number),
              "salary": 70000,
              "title": "three"
            },
            {
              "equity": 0.09,
              "id": expect.any(Number),
              "salary": 100000,
              "title": "twofour",
            }
          ]
        },
        {
          "handle": "d1",
          "name": "D1",
          "numEmployees": 4,
          "jobs": [
            {
              "equity": 0,
              "id": expect.any(Number),
              "salary": 120000,
              "title": "oone"
            }
          ]
        }


      ]
    )
  });

});


/************************************** update */

describe("update", function () {
  const updateData = {
    title: "huge pay",
    salary: 150000,
    equity: "0",
    companyHandle: "d1"
  };

  test("works", async function () {
    let result = await db.query(`
        SELECT id FROM jobs WHERE company_handle = '${updateData.companyHandle}' `);
    let jobId = result.rows[0].id;
    let job = await Job.update(jobId, updateData);
    expect(job).toEqual({
      id: jobId,
      title: "huge pay",
      salary: 150000,
      equity: 0,
      companyHandle: "d1"
    });

    result = await db.query(
      `SELECT company_handle AS "companyHandle", id, title, salary, equity
           FROM jobs
           WHERE id = ${jobId}`);
    expect(result.rows[0]).toEqual({
      id: jobId,
      title: "huge pay",
      salary: 150000,
      equity: "0",
      companyHandle: "d1"
    });
  });

});


/************************************** remove */

describe("remove job", function () {

  test("succesfully removes job", async function () {
    const result = await db.query(`
      SELECT id FROM jobs WHERE company_handle = 'd1' `);

    let jobId = result.rows[0].id;

    await Job.remove(jobId);

    // verify
    let jobs = await Job.findAll("", "", {});
    expect(jobs).toEqual(
      [
        {
          "handle": "c1",
          "name": "C1",
          "numEmployees": 1,
          "jobs": [
            {
              "equity": null,
              "id": expect.any(Number),
              "salary": 50000,
              "title": "one"
            },
            {
              "equity": 0.06,
              "id": expect.any(Number),
              "salary": 60000,
              "title": "onetwo"
            },
            {
              "equity": 0.07,
              "id": expect.any(Number),
              "salary": 70000,
              "title": "three"
            },
            {
              "equity": 0.09,
              "id": expect.any(Number),
              "salary": 100000,
              "title": "twofour"
            }
          ]
        }
      ]
    );

    const res = await db.query(
      "SELECT id FROM jobs WHERE company_handle = 'd1'");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(800);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

