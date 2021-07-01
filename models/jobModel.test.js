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
    company_handle: "e1"
  };

  test("no error - add new job", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual(
      {
        "company_handle": "e1",
        "equity": "0",
        "id": expect.any(Number),
        "salary": 75000,
        "title": "new"
      }
    );

    // verification, id is NOT selected.
    const result = await db.query(
      `SELECT company_handle, title, salary, equity
        FROM jobs
        WHERE title = 'new'`);
    expect(result.rows[0]).toEqual(newJob);
  });

  test("bad request - invalid company for job", async function () {
    newJob.company_handle = "f1";
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
    let jobs = await Job.findAll();
    expect(jobs).toEqual(
      [
        {
          "companyHandle": "d1",
          "equity": "0",
          "id": expect.any(Number),
          "name": "D1",
          "numEmployees": 4,
          "salary": 120000,
          "title": "oone"
        },
        {
          "companyHandle": "c1",
          "equity": "0.09",
          "id": expect.any(Number),
          "name": "C1",
          "numEmployees": 1,
          "salary": 100000,
          "title": "twofour",
        },
        {
          "companyHandle": "c1",
          "equity": "0.07",
          "id": expect.any(Number),
          "name": "C1",
          "numEmployees": 1,
          "salary": 70000,
          "title": "three",
        },
        {
          "companyHandle": "c1",
          "equity": "0.06",
          "id": expect.any(Number),
          "name": "C1",
          "numEmployees": 1,
          "salary": 60000,
          "title": "onetwo",
        },
        {
          "companyHandle": "c1",
          "equity": null,
          "id": expect.any(Number),
          "name": "C1",
          "numEmployees": 1,
          "salary": 50000,
          "title": "one",
        }
      ]
    )
  });

});


// /************************* findAll plus filters */

// describe("findAll with filters", function () {
//   test("works: filter nameLike 1", async function () {
//     let companies = await Company.findAll({ nameLike: "1" });
//     expect(companies).toEqual([
//       {
//         handle: "c1",
//         name: "C1",
//         description: "Desc1",
//         numEmployees: 1,
//         logoUrl: "http://c1.img",
//       },
//       {
//         handle: "d1",
//         name: "D1",
//         description: "Desc d1",
//         numEmployees: 4,
//         logoUrl: "http://d1.img",
//       },
//       {
//         handle: "e1",
//         name: "E1",
//         description: "Desc e1",
//         numEmployees: 5,
//         logoUrl: "http://e1.img",
//       }
//     ]);
//   });

//   test("works: filter nameLike c", async function () {
//     let companies = await Company.findAll({ nameLike: "c" });
//     expect(companies).toEqual([
//       {
//         handle: "c1",
//         name: "C1",
//         description: "Desc1",
//         numEmployees: 1,
//         logoUrl: "http://c1.img",
//       },
//       {
//         handle: "c2",
//         name: "C2",
//         description: "Desc2",
//         numEmployees: 2,
//         logoUrl: "http://c2.img",
//       },
//       {
//         handle: "c3",
//         name: "C3",
//         description: "Desc3",
//         numEmployees: 3,
//         logoUrl: "http://c3.img",
//       }
//     ]);
//   });

//   test("works: filter minEmployees 5", async function () {
//     let companies = await Company.findAll({ minEmployees: 5 });
//     expect(companies).toEqual([
//       {
//         handle: "e1",
//         name: "E1",
//         description: "Desc e1",
//         numEmployees: 5,
//         logoUrl: "http://e1.img",
//       }
//     ]);
//   });

//   test("works: filter minEmployees 6", async function () {
//     let companies = await Company.findAll({ minEmployees: 6 });
//     expect(companies).toEqual([]);
//   });

//   test("works: filter minEmployees 2, maxEmployees 4", async function () {
//     let companies = await Company.findAll({ minEmployees: 2, maxEmployees: 4 });
//     expect(companies).toEqual([
//       {
//         handle: "c2",
//         name: "C2",
//         description: "Desc2",
//         numEmployees: 2,
//         logoUrl: "http://c2.img",
//       },
//       {
//         handle: "c3",
//         name: "C3",
//         description: "Desc3",
//         numEmployees: 3,
//         logoUrl: "http://c3.img",
//       },
//       {
//         handle: "d1",
//         name: "D1",
//         description: "Desc d1",
//         numEmployees: 4,
//         logoUrl: "http://d1.img",
//       }
//     ]);
//   });

//   test("works: filter minEmployees 2, maxEmployees 4, nameLike d", async function () {
//     let companies = await Company.findAll({ minEmployees: 2, maxEmployees: 4, nameLike: "d" });
//     expect(companies).toEqual([
//       {
//         handle: "d1",
//         name: "D1",
//         description: "Desc d1",
//         numEmployees: 4,
//         logoUrl: "http://d1.img",
//       }
//     ]);
//   });

//   // // NOTE: Filtering error tests exist in sql.test.js. Filtering errors in the GET route
//   // //  are tested with the ENTIRE get route.
//   // test("error: filter minEmployees 2, maxEmployees 1, nameLike d", async function () {
//   //   const dataForFilter = { minEmployees: 2, maxEmployees: 1, nameLike: "d" };
//   //   async function companyFindAllBadFilter() {
//   //     let companies = await Company.findAll(dataForFilter);
//   //   }
//   //   expect(companyFindAllBadFilter).toThrowError(new Error(
//   //     `Filter is incorrect: 'minEmployees', ${dataForFilter["minEmployees"]}, is NOT less than 'maxEmployees', ${dataForFilter["maxEmployees"]}.`
//   //   ));

//   // });

// });

// /************************************** get */

// describe("get", function () {
//   test("works", async function () {
//     let company = await Company.get("c1");
//     expect(company).toEqual({
//       handle: "c1",
//       name: "C1",
//       description: "Desc1",
//       numEmployees: 1,
//       logoUrl: "http://c1.img",
//     });
//   });

//   test("not found if no such company", async function () {
//     try {
//       await Company.get("nope");
//       fail();
//     } catch (err) {
//       expect(err instanceof NotFoundError).toBeTruthy();
//     }
//   });
// });


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
      equity: "0",
      companyhandle: "d1"
    });

    // db confirm. For unknown reasons, companyHandle is coming back as 
    //  companyhandle (all lowercase) so updateData could not get spread and 
    //  required hard coded values.
    result = await db.query(
      `SELECT company_handle AS companyHandle, id, title, salary, equity
           FROM jobs
           WHERE id = ${jobId}`);
    expect(result.rows[0]).toEqual({
      id: jobId,
      title: "huge pay",
      salary: 150000,
      equity: "0",
      companyhandle: "d1"
    });
  });

  // test("works: null fields", async function () {
  //   const updateDataSetNulls = {
  //     name: "New",
  //     description: "New Description",
  //     numEmployees: null,
  //     logoUrl: null,
  //   };

  //   let company = await Company.update("c1", updateDataSetNulls);
  //   expect(company).toEqual({
  //     handle: "c1",
  //     ...updateDataSetNulls,
  //   });

  //   const result = await db.query(
  //     `SELECT handle, name, description, num_employees, logo_url
  //        FROM companies
  //        WHERE handle = 'c1'`);
  //   expect(result.rows).toEqual([{
  //     handle: "c1",
  //     name: "New",
  //     description: "New Description",
  //     num_employees: null,
  //     logo_url: null,
  //   }]);
  // });

  // test("not found if no such company", async function () {
  //   try {
  //     await Company.update("nope", updateData);
  //     fail();
  //   } catch (err) {
  //     expect(err instanceof NotFoundError).toBeTruthy();
  //   }
  // });

  // test("bad request with no data", async function () {
  //   try {
  //     await Company.update("c1", {});
  //     fail();
  //   } catch (err) {
  //     expect(err instanceof BadRequestError).toBeTruthy();
  //   }
  // });
});



/************************************** remove */

describe("remove job", function () {

  test("succesfully removes job", async function () {
    const result = await db.query(`
      SELECT id FROM jobs WHERE company_handle = 'd1' `);

    let jobId = result.rows[0].id;

    await Job.remove(jobId);

    // verify
    let jobs = await Job.findAll();
    expect(jobs).toEqual(
      [
        {
          "companyHandle": "c1",
          "equity": "0.09",
          "id": expect.any(Number),
          "name": "C1",
          "numEmployees": 1,
          "salary": 100000,
          "title": "twofour",
        },
        {
          "companyHandle": "c1",
          "equity": "0.07",
          "id": expect.any(Number),
          "name": "C1",
          "numEmployees": 1,
          "salary": 70000,
          "title": "three",
        },
        {
          "companyHandle": "c1",
          "equity": "0.06",
          "id": expect.any(Number),
          "name": "C1",
          "numEmployees": 1,
          "salary": 60000,
          "title": "onetwo",
        },
        {
          "companyHandle": "c1",
          "equity": null,
          "id": expect.any(Number),
          "name": "C1",
          "numEmployees": 1,
          "salary": 50000,
          "title": "one",
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

