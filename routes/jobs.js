"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError, NotFoundError } = require("../expressError");
const { ensureAdmin, ensureLoggedIn } = require("../middleware/auth");
const Job = require("../models/jobModel");

const jobFilterSchema = require("../schemas/jobFilter.json");
const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();


/** POST / { job } 
 * 
 * Body requires title, salary, equity, and companyHandle.
 *
 * Returns { job: { id, title, salary, equity, companyHandle } }
 *
 * Authorization required: Admin
 *   - JWT token with username and isAdmin flag is passed in via  
 *     'Authorization' keyword in the header.
 */

router.post("/", ensureAdmin, async function (req, res, next) {

  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.create(req.body);
    return res.status(201).json({ job });

  } catch (err) {

    // intercept the "insert or update on table "jobs" violates 
    //  foreign key constraint "jobs_company_handle_fkey"
    if (err.code === "23503") {
      // companyHandle not found.
      return next(new NotFoundError(
        `Job NOT created: companyHandle '${req.body.companyHandle}' does not exist`));
    } else {
      return next(err);
    }

  }
});


/** GET /  =>
 *   { jobs: { ..company data.., jobs [ { id, title, salary, equity }, ... ] }
 * 
 * Get all jobs.
 * 
 * Can filter on:
 * - title (will find case-insensitive, partial matches)
 * - minSalary
 * - hasEquity (when true, jobs with equity > 0 only are returned, false means
 *     no filtering based on equity)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {

    // The jobFilter schema was needed because minSalary and hasEquity are 
    //  not in the update schema. Additionally, the integer check in the 
    //  update schema does not work since the minSalary value is a text
    //  because it is part of the query string. 
    const validator = jsonschema.validate(req.query, jobFilterSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const jobs = await Job.findAll("", "", req.query);

    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});


// /** GET /:handle  =>
//  *   { jobs: { ..company data.., jobs [ { id, title, salary, equity }, ... ] }
//  * 
//  * Get all jobs for a specific company.
//  *  
//  * Can filter on:
//  * - title (will find case-insensitive, partial matches)
//  * - minSalary
//  * - hasEquity (when true, jobs with equity > 0 only are returned, false means
//  *     no filtering based on equity)
//  *
//  * Authorization required: none
//  */

// router.get("/:handle", async function (req, res, next) {
//   try {

//     // The jobFilter schema was needed because minSalary and hasEquity are 
//     //  not in the update schema. Additionally, the integer check in the 
//     //  update schema does not work since the minSalary value is a text
//     //  because it is part of the query string. 
//     const validator = jsonschema.validate(req.query, jobFilterSchema);
//     if (!validator.valid) {
//       const errs = validator.errors.map(e => e.stack);
//       throw new BadRequestError(errs);
//     }

//     const jobs = await Job.findAll(req.params.handle, "LEFT ", req.query);

//     return res.json(jobs[0]);
//   } catch (err) {
//     return next(err);
//   }
// });


/** GET /[id]  =>  { job }
 *
 *  job is { jobDetail: { ..company data.., job { id, title, salary, equity } } }
  *
 *  Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  try {
    const jobDetail = await Job.get(req.params.id);
    return res.json({ jobDetail });
  } catch (err) {
    return next(err);
  }
});


/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job details.
 *
 * fields can be: { title, salary, and equity }
 * 
 * The id and company_handle cannot get updated for an existing job.
 *
 * Returns { job: { companyHandle, id, title, salary, equity } } }
 *
 * Authorization required: Admin
 *  - JWT token with username and isAdmin flag is passed in via  
 *     'Authorization' keyword in the header.
 */

router.patch("/:id", ensureAdmin, async function (req, res, next) {

  try {
    const validator = jsonschema.validate(req.body, jobUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.update(req.params.id, req.body);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});


/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization required: Admin
 *  - JWT token with username and isAdmin flag is passed in via  
 *    'Authorization' keyword in the header.
 */
router.delete("/:id", ensureAdmin, async function (req, res, next) {

  try {
    await Job.remove(req.params.id);
    return res.json({ deleted: req.params.id });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
