const { sqlForFilter, sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", function () {
  test("dataToUpdate fields match db table, no jsToSql required", function () {
    const dataToUpdate = { password: "val_pass", email: "val_email" };
    const setCols = '"password"=$1, "email"=$2'
    const values = ["val_pass", "val_email"]
    const result = sqlForPartialUpdate(dataToUpdate, {});
    expect(result.setCols).toEqual(setCols);
    expect(result.values).toEqual(values);
  });

  test("dataToUpdate fields require mappings in jsToSql", function () {
    const dataToUpdate = { firstName: "val_first_name", lastName: "val_last_name", email: "val_email" };
    const jsToSql = { firstName: "first_name", lastName: "last_name" };
    const setCols = '"first_name"=$1, "last_name"=$2, "email"=$3'
    const values = ["val_first_name", "val_last_name", "val_email"]
    const result = sqlForPartialUpdate(dataToUpdate, jsToSql);
    expect(result.setCols).toEqual(setCols);
    expect(result.values).toEqual(values);
  });

  test("mappings in jsToSql do not correspond to dataToUpdate fields", function () {
    const dataToUpdate = { firstName: "val_first_name", lastName: "val_last_name", email: "val_email" };
    const jsToSql = { firstNameX: "first_name", lastNameX: "last_name" };
    const setCols = '"firstName"=$1, "lastName"=$2, "email"=$3'
    const values = ["val_first_name", "val_last_name", "val_email"]
    const result = sqlForPartialUpdate(dataToUpdate, jsToSql);
    expect(result.setCols).toEqual(setCols);
    expect(result.values).toEqual(values);
  });

  test("error: dataToUpdate is empty - no data error", function () {
    function sqlForPartialUpdateNoData() {
      sqlForPartialUpdate({}, { firstNameX: "first_name", lastNameX: "last_name" });
    }
    expect(sqlForPartialUpdateNoData).toThrowError(new Error("No data"));
  });

  test("error: both dataToUpdate and jsToSql are empty - no data error", function () {
    function sqlForPartialUpdateNoData() {
      sqlForPartialUpdate({}, {});
    }
    expect(sqlForPartialUpdateNoData).toThrowError(new Error("No data"));
  });

});


describe("sqlForFilter - companies", function () {

  // NOTE - dataForFilter has values from the query STRING so all values are strings. Query string
  //  values that are integers (minEmployees, maxEmployees) are coereced into the Integer datatype 
  //  when saved in the values array.

  tableName = "companies";
  test("companies filter builder, no errors", function () {
    const dataForFilter = { nameLike: "txt in name", minEmployees: "20", maxEmployees: "200" };
    const whereClause = 'WHERE name ILIKE $1 AND num_employees >= $2 AND num_employees <= $3'
    const values = ["%txt in name%", 20, 200]
    const result = sqlForFilter(dataForFilter, "companies");
    expect(result.whereClause).toEqual(whereClause);
    expect(result.values).toEqual(values);
  });

  test("companies filter builder, no errors", function () {
    const dataForFilter = { nameLike: "txt in name", minEmployees: "20", maxEmployees: "200" };
    const whereClause = 'WHERE name ILIKE $1 AND num_employees >= $2 AND num_employees <= $3'
    const values = ["%txt in name%", 20, 200]
    const result = sqlForFilter(dataForFilter, "companies");
    expect(result.whereClause).toEqual(whereClause);
    expect(result.values).toEqual(values);
  });

  test("companies filter builder, no errors text trim and minEmployees", function () {
    const dataForFilter = { nameLike: "     txt in name     ", minEmployees: "20" };
    const whereClause = 'WHERE name ILIKE $1 AND num_employees >= $2'
    const values = ["%txt in name%", 20]
    const result = sqlForFilter(dataForFilter, "companies");
    expect(result.whereClause).toEqual(whereClause);
    expect(result.values).toEqual(values);
  });

  test("companies filter builder, no errors company name only", function () {
    const dataForFilter = { nameLike: "txt in name" };
    const whereClause = 'WHERE name ILIKE $1'
    const values = ["%txt in name%"]
    const result = sqlForFilter(dataForFilter, "companies");
    expect(result.whereClause).toEqual(whereClause);
    expect(result.values).toEqual(values);
  });

  test("companies filter builder, no errors minEmployees only", function () {
    const dataForFilter = { minEmployees: "20" };
    const whereClause = 'WHERE num_employees >= $1'
    const values = [20]
    const result = sqlForFilter(dataForFilter, "companies");
    expect(result.whereClause).toEqual(whereClause);
    expect(result.values).toEqual(values);
  });

  test("companies filter builder, no errors maxEmployees only", function () {
    const dataForFilter = { maxEmployees: "300" };
    const whereClause = 'WHERE num_employees <= $1'
    const values = [300]
    const result = sqlForFilter(dataForFilter, "companies");
    expect(result.whereClause).toEqual(whereClause);
    expect(result.values).toEqual(values);
  });

  // this test may need to change depending on how it is integrated in the SELECT
  test("companies filter builder no data, returns ''", function () {
    const result = sqlForFilter({}, "companies");
    expect(result.whereClause).toEqual("");
    expect(result.values).toEqual([]);
  });

  // this test may need to change depending on how it is integrated in the SELECT
  test("companies filter builder undefined data, returns ''", function () {
    const result = sqlForFilter(undefined, "companies");
    expect(result.whereClause).toEqual("");
    expect(result.values).toEqual([]);
  });

  test("companies filter builder max < min, error: field max is not >= min", function () {
    const dataForFilter = { nameLike: "txt in name", minEmployees: "20", maxEmployees: "10" };
    function sqlForFilterBadMinMax() {
      sqlForFilter(dataForFilter, "companies");
    }
    expect(sqlForFilterBadMinMax).toThrowError(new Error(
      `Filter is incorrect: 'minEmployees', ${dataForFilter["minEmployees"]}, is NOT less than 'maxEmployees', ${dataForFilter["maxEmployees"]}.`)
    );
  });

  test("companies filter builder max = min, error: field max is not >= min", function () {
    const dataForFilter = { nameLike: "txt in name", minEmployees: "20", maxEmployees: "20" };
    function sqlForFilterBadMinMax() {
      sqlForFilter(dataForFilter, "companies");
    }
    expect(sqlForFilterBadMinMax).toThrowError(new Error(
      `Filter is incorrect: 'minEmployees', ${dataForFilter["minEmployees"]}, is NOT less than 'maxEmployees', ${dataForFilter["maxEmployees"]}.`)
    );
  });

  test("companies filter builder invalid field, error: filtering not possible", function () {
    const dataForFilter = { invalidField: "txt in name", minEmployees: "20", maxEmployees: "200" };
    const tableName = "companies";
    function sqlForFilterBadMinMax() {
      sqlForFilter(dataForFilter, tableName);
    }
    expect(sqlForFilterBadMinMax).toThrowError(new Error(
      `Filtering '${tableName}' by 'invalidField' is not possible.`)
    );
  });

});


describe("sqlForFilter - jobs", function () {

  // NOTE - dataForFilter has values from the query STRING so all values are strings. Query string
  //  values that are integers (minSalary) are coereced into the Integer datatype when saved in the 
  //  values array.

  test("jobs filter builder, title and salary only no errors", function () {
    const dataForFilter = { title: "job title", minSalary: "100000" };
    const whereClause = 'WHERE title ILIKE $1 AND salary >= $2'
    const values = ["%job title%", 100000]
    const result = sqlForFilter(dataForFilter, "jobs");
    expect(result.whereClause).toEqual(whereClause);
    expect(result.values).toEqual(values);
  });

  test("jobs filter builder with different field order, no errors", function () {
    const dataForFilter = { minSalary: "100000", title: "job title" };
    const whereClause = 'WHERE salary >= $1 AND title ILIKE $2'
    const values = [100000, "%job title%"]
    const result = sqlForFilter(dataForFilter, "jobs");
    expect(result.whereClause).toEqual(whereClause);
    expect(result.values).toEqual(values);
  });

  test("jobs filter builder, all possible fields no errors", function () {
    const dataForFilter = { title: "job title", hasEquity: "true", minSalary: "100000" };
    const whereClause = 'WHERE title ILIKE $1 AND equity > 0 AND salary >= $2'
    const values = ["%job title%", 100000]
    const result = sqlForFilter(dataForFilter, "jobs");
    expect(result.whereClause).toEqual(whereClause);
    expect(result.values).toEqual(values);
  });

  test("jobs filter builder, all possible fields, different order no errors", function () {
    const dataForFilter = { hasEquity: "true", minSalary: "100000", title: "job title" };
    const whereClause = 'WHERE equity > 0 AND salary >= $1 AND title ILIKE $2'
    const values = [100000, "%job title%"]
    const result = sqlForFilter(dataForFilter, "jobs");
    expect(result.whereClause).toEqual(whereClause);
    expect(result.values).toEqual(values);
  });

  test("jobs filter builder, all possible fields, hasEquity is false, no errors", function () {
    const dataForFilter = { hasEquity: "false", minSalary: "100000", title: "job title" };
    const whereClause = 'WHERE ((equity >= 0) OR (equity IS NULL)) AND salary >= $1 AND title ILIKE $2'
    const values = [100000, "%job title%"]
    const result = sqlForFilter(dataForFilter, "jobs");
    expect(result.whereClause).toEqual(whereClause);
    expect(result.values).toEqual(values);
  });

  test("jobs filter builder, all possible fields, hasEquity (2nd param) is false, no errors", function () {
    const dataForFilter = { minSalary: "100000", hasEquity: "false", title: "job title" };
    const whereClause = 'WHERE salary >= $1 AND ((equity >= 0) OR (equity IS NULL)) AND title ILIKE $2'
    const values = [100000, "%job title%"]
    const result = sqlForFilter(dataForFilter, "jobs");
    expect(result.whereClause).toEqual(whereClause);
    expect(result.values).toEqual(values);
  });

  test("jobs filter builder, all possible fields, hasEquity (last param) is false, no errors", function () {
    const dataForFilter = { minSalary: "100000", title: "job title", hasEquity: "false" };
    const whereClause = 'WHERE salary >= $1 AND title ILIKE $2 AND ((equity >= 0) OR (equity IS NULL))'
    const values = [100000, "%job title%"]
    const result = sqlForFilter(dataForFilter, "jobs");
    expect(result.whereClause).toEqual(whereClause);
    expect(result.values).toEqual(values);
  });

});
