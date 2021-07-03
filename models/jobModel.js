"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForFilter, sqlForPartialUpdate } = require("../helpers/sql");
const Company = require("./company");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { company_handle, title, salary, equity }
   *
   * Returns { id, company_handle, title, salary, equity }
   *
   * No duplicate logic exists for jobs because the id will keep the job 
   *  unique and a company may have multiple openings for the same title, 
   *  position, and salary.
   * 
   **/

  static async create({ companyHandle, title, salary, equity }) {

    const result = await db.query(
      `INSERT INTO jobs
           (company_handle, title, salary, equity)
           VALUES ($1, $2, $3, $4)
           RETURNING id, company_handle, title, salary, equity`,
      [
        companyHandle
        , title
        , salary
        , equity
      ],
    );

    const job = result.rows[0];

    // company_handle key name should be companyHandle on output. 'AS' for 
    //  some reason on RETURNING has the key in all lowercase.
    // Return numeric form of equity when it is not null.
    return {
      id: job.id,
      companyHandle: job.company_handle,
      title: job.title,
      salary: job.salary ? +job.salary : job.salary,
      equity: job.equity ? +job.equity : job.equity
    };
  }


  /** Find all jobs for a company.
   *
   * Returns [{ companyHandle, name, numEmployees, id, title, salary, equity }, ...]
   * 
   * */

  static async findAll(handle, joinType, filterValues) {

    let filtersInAffect = false;

    const keys = Object.keys(filterValues);
    if (keys.length > 0) {
      filtersInAffect = true;
    }

    // when a handle exists, we have a findall for a specific company.
    if (handle) {
      // add the handle to filterValues this way, we are guaranteed a where clause
      filterValues.handle = handle;
    }

    const filter = sqlForFilter(filterValues, "jobs");

    // This is a common query. 
    // for get jobs/ , joinType is '' because all companies with a job 
    //  is an inner join.
    // for bet jobs/:handle, joinType is 'LEFT ' because the company
    //  should get returned, even when there are no jobs. 
    let companyJobs = await db.query(
      `SELECT c.handle
            , c.name
            , c.num_employees AS "numEmployees"
            , c.description
            , c.logo_url AS "logoUrl"
            , json_agg(j.*) AS jobs
        FROM companies AS c    
        ${joinType}JOIN jobs AS j ON c.handle = j.company_handle
        ${filter.whereClause} 
        GROUP BY c.handle, c.name, c.num_employees, c.description, c.logo_url
        ORDER BY c.handle 
      `, filter.values);

    if (companyJobs.rows.length === 0) {
      // is it 0 because the company was not found or 0 because of filters? 
      if (filtersInAffect) {
        // Does the company exist?
        if (handle) {
          companyJobs = await Company.get(handle);

          // Company.get() will throw an error when the company was not found.
          // We are still in findAll because the company WAS found, the 
          //  filtering caused nothing to return.
          companyJobs.jobs = [];
          return [companyJobs];

        } else {
          // handle is "" so this is a get all jobs with filters and 
          //  nothing came back.
          throw new NotFoundError(`No jobs were found due to filter settings`);
        }
      } else {
        // company was not found.
        throw new NotFoundError(`No company: ${handle}`);
      }

    }

    // delete job.company_handle from all jobs at a company. We already have the company handle.
    // Were there jobs found?
    if (companyJobs.rows[0].jobs[0]) {
      // we have jobs for the company
      companyJobs.rows.forEach(company => {
        if (!(handle)) {
          delete company.description;
          delete company.logoUrl;
        }
        company.jobs.forEach(job => {
          delete job.company_handle;
        });
      });
    } else {
      // jobs[0] is null because there are no jobs for the company OR
      //  filtering resulted in no jobs.
      // pop jobs so we have [] instead of [ null ] in the output.
      companyJobs.rows[0].jobs.pop();
    }

    return companyJobs.rows;

  }


  /** Given a job id, return details about the job.
   *
   * Returns { ..company data.., jobs [ { job }, { job } ] }
   *   where job is [{ id, title, salary, equity }, ...]
   *
   * Throws NotFoundError when job id is not found.
   **/

  static async get(id) {
    const result = await db.query(
      `SELECT company_handle AS "handle"
          , name
          , num_employees AS "numEmployees"
          , id
          , title
          , salary
          , equity
        FROM jobs AS j 
        JOIN companies as c ON j.company_handle = c.handle
        WHERE id = $1 
      `, [id]);

    if (result.rows.length === 0) throw new NotFoundError(`No job: ${id}`);

    let jobDetail = result.rows[0];

    // Return numeric form of equity when it is not null.
    return {
      handle: jobDetail.handle,
      name: jobDetail.name,
      numEmployees: jobDetail.numEmployees,
      job: {
        id: jobDetail.id,
        title: jobDetail.title,
        salary: jobDetail.salary,
        equity: jobDetail.equity ? +jobDetail.equity : jobDetail.equity
      }
    };

  }


  /** Update job data with `data`.
   *
   * This is a "partial update" and only updates the fields passed
   * in data. Update occurs regardless of whether values provided in
   * data differ from db values.
   *
   * Updatable data can only include: {title, salary, equity}
   *
   * Returns {company_handle, id, title, salary, equity}
   *
   * Throws NotFoundError when id not found.
   */

  static async update(id, data) {

    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        companyHandle: "company_handle"
      });
    const idVarIdx = "$" + (values.length + 1);

    const querySql =
      `UPDATE jobs 
        SET ${setCols} 
        WHERE id = ${idVarIdx} 
        RETURNING company_handle, id, title, salary, equity
       `;

    const result = await db.query(querySql, [...values, id]);

    if (result.rows === 0) throw new NotFoundError(`No job: ${id}`);

    const job = result.rows[0];


    // Return numeric form of equity when it is not null.
    return {
      companyHandle: job.company_handle,
      id: job.id,
      title: job.title,
      salary: job.salary,
      equity: job.equity ? +job.equity : job.equity
    };
  }


  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError when job id not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
      [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }

}


module.exports = Job;
