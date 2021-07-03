"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { sqlForPartialUpdate } = require("../helpers/sql");
const {
  ExpressError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError
} = require("../expressError");

const { BCRYPT_WORK_FACTOR } = require("../config.js");


/** Related functions for users. */

class User {
  /** authenticate user with username, password.
   *
   * Returns { username, first_name, last_name, email, is_admin }
   *
   * Throws UnauthorizedError is user not found or wrong password.
   **/

  static async authenticate(username, password) {
    // try to find the user first
    const result = await db.query(
      `SELECT username,
                  password,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
      [username],
    );

    const user = result.rows[0];

    if (user) {
      // compare hashed password to a new hash from password
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid === true) {
        delete user.password;
        return user;
      }
    }

    throw new UnauthorizedError("Invalid username/password");
  }


  /** Register user with data.
   *
   * Returns { username, firstName, lastName, email, isAdmin }
   *
   * Throws BadRequestError on duplicates.
   **/

  static async register(
    { username, password, firstName, lastName, email, isAdmin }) {
    const duplicateCheck = await db.query(
      `SELECT username
           FROM users
           WHERE username = $1`,
      [username],
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Duplicate username: ${username}`);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
      `INSERT INTO users
           (username,
            password,
            first_name,
            last_name,
            email,
            is_admin)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING username, first_name AS "firstName", last_name AS "lastName", email, is_admin AS "isAdmin"`,
      [
        username,
        hashedPassword,
        firstName,
        lastName,
        email,
        isAdmin
      ],
    );

    const user = result.rows[0];

    return user;
  }


  /** User applies for a job.
   *
   * Returns { job_id: jobId }
   *
   * Throws BadRequestError on duplicates.
   * 
   * Throws NotFoundError on username or jobId not found.
   **/

  static async applyForJob({ username, id }) {

    const duplicateCheck = await db.query(
      `SELECT username, job_id
      FROM applications
      WHERE username = $1 AND job_id = $2`,
      [username, id]
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Duplicate username: ${username} has already applied for job ${id}`);
    }

    try {

      const result = await db.query(
        `INSERT INTO applications
         (username,
         job_id)
         VALUES ($1, $2)
         RETURNING job_Id`,
        [
          username,
          id
        ],
      );

      const application = result.rows[0];

      return application;

    } catch (error) {
      // check for foreign key constraint violation
      if (error.code === "23503") {
        // username and job_id must exist in users and jobs tables respectively.
        // check for job_id error. 
        if (error.message.indexOf("applications_job_id_fkey") > -1) {
          throw new NotFoundError(
            `Application NOT created: job id '${id}' was not found.`
          )
        } else {
          // 'applications_job_id_fkey' was not found. username must be the error.
          throw new NotFoundError(
            `Application NOT created: username '${username}' was not found.`
          )
        }
      } else {
        // catch all
        throw new ExpressError(error.message, 500)
      }
    }
  }


  /** Find all users.
   *
   * Returns [{ username, first_name, last_name, email, is_admin }, ...]
   **/

  static async findAll() {
    const result = await db.query(
      `SELECT  u.username,
              u.first_name AS "firstName",
              u.last_name AS "lastName",
              u.email,
              u.is_admin AS "isAdmin",
              json_agg(a.job_id) AS "jobs"
        FROM users AS u 
        LEFT JOIN applications AS a ON u.username = a.username 
        GROUP BY u.username, u.first_name, u.last_name, u.email, u.is_admin
        ORDER BY u.username`,
    );

    // delete the jobs key when it is null.
    result.rows.forEach(user => {
      if (user.jobs[0] === null) {
        delete user.jobs;
      };
    });

    return result.rows;
  }


  /** Given a username, return data about user.
   *
   * Returns { username, first_name, last_name, is_admin, jobs }
   *   where jobs is { id, title, company_handle, company_name, state }
   *
   * Throws NotFoundError if user not found.
   **/

  static async get(username) {
    const userRes = await db.query(
      `SELECT u.username,
              u.first_name AS "firstName",
              u.last_name AS "lastName",
              u.email,
              u.is_admin AS "isAdmin",
              a.job_id
           FROM users AS u
           LEFT JOIN applications AS a ON u.username = a.username 
           WHERE u.username = $1`,
      [username],
    );

    const user = userRes.rows[0];
    if (!user) throw new NotFoundError(`No user: ${username}`);

    // restructure the jobs.
    const jobs = [];
    userRes.rows.forEach(row => {
      if (row.job_id) {
        jobs.push(row.job_id);
      }
    });

    if (jobs.length > 0) {
      // add the jobs array to the user object when there are job ids in the 
      //  jobs array
      user.jobs = jobs;
    }
    // always delete job_id. It is not needed since job ids are
    //  now in the jobs array.
    delete user.job_id;

    return user;
  }


  /** Update user data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   *
   * Data can include:
   *   { firstName, lastName, password, email, isAdmin }
   *
   * Returns { username, firstName, lastName, email, isAdmin }
   *
   * Throws NotFoundError if not found.
   *
   * WARNING: this function can set a new password or make a user an admin.
   * Callers of this function must be certain they have validated inputs to this
   * or a serious security risks are opened.
   */

  static async update(username, data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
    }

    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        firstName: "first_name",
        lastName: "last_name",
        isAdmin: "is_admin",
      });
    const usernameVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE users 
                      SET ${setCols} 
                      WHERE username = ${usernameVarIdx} 
                      RETURNING username,
                                first_name AS "firstName",
                                last_name AS "lastName",
                                email,
                                is_admin AS "isAdmin"`;
    const result = await db.query(querySql, [...values, username]);
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    delete user.password;
    return user;
  }


  /** Delete given user from database; returns undefined. */

  static async remove(username) {
    let result = await db.query(
      `DELETE
           FROM users
           WHERE username = $1
           RETURNING username`,
      [username],
    );
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);
  }
}


module.exports = User;
