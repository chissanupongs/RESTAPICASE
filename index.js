const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const fs = require("fs");
const YAML = require('yaml');
const cors = require('cors');
const { ApolloServer, gql } = require('apollo-server')

const typeDefs = gql`
  type Case{
    token: String
    case_id: [String]
    case_status: String
    case_result: String
  }

  type Query{
    caselist: [Case]
  }
`

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

  let updatedCases = [];

  case_id.forEach(singleCaseId => {
    // หา index ของเคสที่มี token และ case_id ตรงกับ singleCaseId
    const index = caselist.findIndex(item => item.token === token && item.case_id.includes(singleCaseId));
    
    if (index !== -1) {
      // อัปเดต case_status ของเคสที่เจอ
      caselist[index].case_status = case_status;
      updatedCases.push(caselist[index]);
    } else {
      // สร้างเคสใหม่สำหรับ case_id นี้
      const newCase = { token, case_id: [singleCaseId], case_status };
      caselist.push(newCase);
      updatedCases.push(newCase);
    }
  });

  res.status(200).json(updatedCases);
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

  let updatedCases = [];

  case_id.forEach(singleCaseId => {
    const index = caselist.findIndex(item => item.token === token && item.case_id.includes(singleCaseId));

    if (index !== -1) {
      caselist[index].case_result = case_result;
      updatedCases.push(caselist[index]);
    } else {
      const newCase = { token, case_id: [singleCaseId], case_result };
      caselist.push(newCase);
      updatedCases.push(newCase);
    }
  });

  res.status(200).json(updatedCases);
});

const resolvers = {
  Query: {
    caselist: () => caselist
  }
}

// GET all cases (for testing)
app.get('/cases', (req, res) => {
  res.json(caselist);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(`server ready at port ${url}`)
})