const { BadRequestError } = require("../expressError");

/** 
 * sqlForPartialUpdate builds the column names and $-parameters, "first_name"=$x,
 *  for the SET clause and the values that map to the $-parameters. 
 * This function DOES NOT validate the contents of dataToUpdate - the validation of 
 *  body key fields needs to occur in the routes.
 * dataToUpdate, object, contains the key:value pair for each value to 
 *  update. The 'key' is the field name from the JSON body and it may differ from 
 *  the column name in the db table.
 * jsToSql, object, contains the key:value pair for SOME of the keys in dataToUpdate.
 *  jsToSql maps a JSON field name key in dataToUpdate to the field name in the table:
 *  dataToUpdate{
 *    firstName: 'Aliya',
 *    age: 32
 *  }
 *  jsToSql{
 *    firstName: 'first_name'
 *  }
 *  'firstName' key in dataToUpdate exists in the db table as 'first_name', 'age' exists 
 *  as 'age' in the db table. jsToSql only needs to provide a mapping value of 'firstName'
 *  to 'first_name'.
 * The update WILL fail if the column names in the set are not columns in the db.table.
 * Function returns {
 *    setCols, string of "field1" = $1, "field2" = $2... for each field in dataToUpdate
 *    values, an array with the values in the same order as the fields listed in setCols. 
 * }
 *  
 * @param {*} dataToUpdate 
 * @param {*} jsToSql 
 * @returns {setCols, values}
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
    // use either the mapping column name from jsToSql for the field (key) when
    //  a db table value exists in jsToSql for the key in colName. Otherwise,
    //  no key name changes exist and colName is used.
    `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}


/**
 * sqlForFilter builds the WHERE clause for an SQL SELECT based on the key:values
 *  in dataForFilter. Both companies and jobs tables have mostly similar logic and this 
 *  function builds the where clause for both filtered companies and filtered jobs.
 * This function DOES NOT validate the contents of dataForFilter - the validation of 
 *  query string must occur in the routes.
 * dataForFilter, object, contains the key:value pairs for the values entered in the 
 *  query string. Again, a validator in the route should ensure the values are valid.
 * table, string, is the table that will use the filter. This function contains a mapping
 *  of how to handle the fields. 
 * This function may get split and placed in the Company and Job model.
 * Function returns {
 *    whereClause, string of "WHERE field1 comparison2 $1, field2 comparion2 $2... for each 
 *      field in dataForFilter
 *    values, array, the values in the same order as the fields listed in setCols. 
 *  } 
 *
 * @param {*} dataForFilter 
 * @param {*} table 
 * @returns 
 */

function sqlForFilter(dataForFilter, table) {

  if (dataForFilter) {

    const keys = Object.keys(dataForFilter);
    if (keys.length > 0) {

      // before we start declaring stuff, check whether both min and max exist and
      //  error when max is <= min.
      if ((Object.hasOwnProperty.call(dataForFilter, "minEmployees")) &&
        (Object.hasOwnProperty.call(dataForFilter, "maxEmployees"))) {
        // error if max is less than or equal to min.
        if (+dataForFilter["maxEmployees"] <= +dataForFilter["minEmployees"]) {
          throw new BadRequestError(
            `Filter is incorrect: 'minEmployees', ${dataForFilter["minEmployees"]}, is NOT less than 'maxEmployees', ${dataForFilter["maxEmployees"]}.`);
        }

      }

      // Some commonality exists between company and job fields. strings and numerics
      //  will have some consistent and formatting. As an example, a string filter
      //  needs to result in dbName ILIKE "%filterVal%"
      const fields = {
        companies: {
          nameLike: { dbName: "name", type: "string" },
          minEmployees: { dbName: "num_employees", type: "integer", comparison: ">=" },
          maxEmployees: { dbName: "num_employees", type: "integer", comparison: "<=" }
        },
        jobs: {
          title: { dbName: "title", type: "string" },
          minSalary: { dbName: "salary", type: "integer", comparison: ">=" },
          hasEquity: { dbName: "equity" }
        }
      };

      const valuesOut = [];
      const cols = keys.map((colName) => {

        let tempClause = "";

        // throw an error when colName is in not in fields
        if (Object.hasOwnProperty.call(fields[table], colName) === false) {
          throw new BadRequestError(`Filtering '${table}' by '${colName}' is not possible.`);
        }

        // if (fields[table][colName] === "hasEquity") {
        if (colName === "hasEquity") {
          // hasEquity value of true or false.
          if (dataForFilter[colName]) {
            // When hasEquity is true, filter to jobs that provide a non-zero amount of equity.
            // return because the value passed in for hasEquity is true / false and is not
            //  parameterized.
            return `${fields[table][colName]["dbName"]} > 0`;
          } else {
            // There are no where clause values to set when when hasEquity is false
            return `${fields[table][colName]["dbName"]} >= 0`;
          }
        }

        if (fields[table][colName]["type"] === "string") {
          // need to build dbName ILIKE '%$1%'
          tempClause = `${fields[table][colName]["dbName"]} ILIKE $${valuesOut.length + 1}`;
          valuesOut.push(`%${dataForFilter[colName].trim()}%`);
        } else {
          // field is not a string so it must be an integer.
          if (fields[table][colName]["type"] === "integer") {
            tempClause = `${fields[table][colName]["dbName"]} ${fields[table][colName]["comparison"]} $${valuesOut.length + 1}`;
            valuesOut.push(+dataForFilter[colName]);

          } else {
            // this should only run when new fields to the fields object and the new fields 
            //  are not string or integer.
            throw new BadRequestError(`Filtering '${table}' by '${colName}' is not possible.`);
          }
        }

        return tempClause;

      });

      return {
        whereClause: `WHERE ${cols.join(" AND ")}`,
        values: valuesOut
      };

    }
  }

  // returns empty string whereClause and empty values array. The "" whereClause 
  //  and empty values array will not affect the SELECT.
  return {
    whereClause: "",
    values: []
  }

}

// companies:
// name: filter by company name: if the string “net” is passed in, this should find 
// any company who name contains the word “net”, case-insensitive (so “Study Networks” 
//   should be included).
// minEmployees: filter to companies that have at least that number of employees.
// maxEmployees: filter to companies that have no more than that number of employees.
//   If the minEmployees parameter is greater than the maxEmployees parameter, 
//   respond with a 400 error with an appropriate message.

// jobs:
// title: filter by job title. Like before, this should be a case-insensitive, 
//   matches-any-part-of-string search.
// minSalary: filter to jobs with at least that salary.
// hasEquity: if true, filter to jobs that provide a non-zero amount of equity. 
//   If false or not included in the filtering, list all jobs regardless of equity.


module.exports = {
  sqlForFilter
  , sqlForPartialUpdate
};
