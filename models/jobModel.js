"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForFilter, sqlForPartialUpdate } = require("../helpers/sql");

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
      salary: job.salary,
      equity: job.equity ? +job.equity : job.equity
    };
  }


  /** Find all jobs for a company.
   *
   * Returns [{ companyHandle, name, numEmployees, id, title, salary, equity }, ...]
   * 
   * */

  static async findAll(handle, filterValues) {

    // when a handle exists, we have a findall for a specific company.
    if (handle) {
      // add the handle to filterValues this way, we are guaranteed a where clause
      filterValues.handle = handle;
    }

    const filter = sqlForFilter(filterValues, "jobs");

    const companyJobs = await db.query(
      `SELECT c.handle AS "companyHandle"
            , c.name
            , c.num_employees AS "numEmployees"
            , json_agg(j.*) AS jobs
          FROM jobs AS j 
          JOIN companies as c ON j.company_handle = c.handle
          ${filter.whereClause} 
          GROUP BY c.handle, c.name, c.num_employees
          ORDER BY c.handle 
      `, filter.values);

    // delete job.company_handle from all jobs at a company. We already have the company handle.
    companyJobs.rows.forEach(company => {
      company.jobs.forEach(job => {
        delete job.company_handle;
      });
    });
    return companyJobs.rows;

  }


  /** Given a job id, return details about the job.
   *
   * Returns { ..company data.., job { id, title, salary, equity } }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError when job id is not found.
   **/

  static async get(id) {
    const result = await db.query(
      `SELECT company_handle AS "companyHandle"
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
      companyHandle: jobDetail.companyHandle,
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

    // Not sure why RETURNING company_handle AS companyHandle ... returns
    //  companyhandle. Due to this issue, a reconstructed 'job' object is 
    //  returned.
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
