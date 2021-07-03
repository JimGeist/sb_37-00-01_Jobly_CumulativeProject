# sb_37-00-01_Jobly_CumulativeProject

**Jobly Backend**

This is the Express backend for Jobly, version 2.

To run / start the Jobly server:
    `node server.js`
    
To run the tests:
    `jest -i`


### ENHANCEMENTS
- Validation Schemas align to the database better. Company handle in many cases did not have a maximum lenght in the provided schema even though the db limit is 25. 


### DIFFICULTIES 
- Not 'seeing' the error and 'confirmation bias' of this worked, wtf is going on now? It is frustrating. It isn't that this was a complicated assignment. I misread aspects of it and as a result, generated bits of code that seem kludgey because I tried to use the same bit of code in multiple situations.
- Not knowing if an API should return null for a value in the object or just leave the key off.
- `json_agg(OneArgument)` - needed to pause and read the function description. `json_agg(id, title, salary, equity)` resulted in a function not found error message. Did I miss something? Do I need to `require` it (no). Oh shoot, am I 
somehow using an older version of PostreSQL (no, after deleting `nodde_modules`, changing `package.json` to use `"pg": "^9.3"` (there is no 9.3 by the way)) until I finally realized the function is not found because the signature is one argument, not x. `json_agg(jobs.*)` worked, but `companyHandle` in the aggregate is redundant since it exists in the company portion of the object. I needed to remind myself more to make progress, get it working than circle back and adjust. 
- The jobs by company lookup was initially built in the `Job` model and `routes/jobs.js`. Building it in the wrong spot was discovered during testing when getting a job by id was not working because `job/:handle` existed when it should have been `company/:handle` in the companies route. And 'fixing' the issue just ate up time. 
- Major route and model components were tested. The only piece that received minimal testing was **Part 5: Job Applications**. The logic works and was loosely, very loosely tested in the `.delete("/companies/x")` test because the test included proof of cascading deletes of jobs and applications when the company is delete.
