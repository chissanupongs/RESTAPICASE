const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const fs = require("fs");
const YAML = require('yaml');
const cors = require('cors');

const file = fs.readFileSync('./swagger.yaml', 'utf8');
const swaggerDocument = YAML.parse(file);

const app = express();
const port = 8000;

app.use(bodyParser.json());
app.use(cors());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ENUM definitions
const VALID_STATUSES = ["Opened", "Closed"];
const VALID_RESULTS = ["WaitingAnalysis", "TruePosotives", "FalsePosotives"];

// Initial data
let caselist = [];

// Helper function to find index of a case by token + case_id
function findCaseIndex(token, case_id_array) {
  return caselist.findIndex(
    item => item.token === token &&
            JSON.stringify(item.case_id.sort()) === JSON.stringify(case_id_array.sort())
  );
}

// POST /updatecasestatus
app.post('/updatecasestatus', (req, res) => {
  const { token, case_id, case_status } = req.body;

  if (!token || !Array.isArray(case_id) || !case_id.every(id => typeof id === "string")) {
    return res.status(400).send("Invalid input: 'token' must be string and 'case_id' must be array of strings.");
  }

  if (!VALID_STATUSES.includes(case_status)) {
    return res.status(400).send(`Invalid 'case_status'. Allowed values: ${VALID_STATUSES.join(", ")}`);
  }

  const index = findCaseIndex(token, case_id);

  if (index !== -1) {
    caselist[index].case_status = case_status;
    res.json(caselist[index]);
  } else {
    const newCase = { token, case_id, case_status };
    caselist.push(newCase);
    res.status(201).json(newCase);
  }
});

// POST /updatecaseresult
app.post('/updatecaseresult', (req, res) => {
  const { token, case_id, case_result } = req.body;

  if (!token || !Array.isArray(case_id) || !case_id.every(id => typeof id === "string")) {
    return res.status(400).send("Invalid input: 'token' must be string and 'case_id' must be array of strings.");
  }

  if (!VALID_RESULTS.includes(case_result)) {
    return res.status(400).send(`Invalid 'case_result'. Allowed values: ${VALID_RESULTS.join(", ")}`);
  }

  const index = findCaseIndex(token, case_id);

  if (index !== -1) {
    caselist[index].case_result = case_result;
    res.json(caselist[index]);
  } else {
    const newCase = { token, case_id, case_result };
    caselist.push(newCase);
    res.status(201).json(newCase);
  }
});

// GET all cases (for testing)
app.get('/cases', (req, res) => {
  res.json(caselist);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
