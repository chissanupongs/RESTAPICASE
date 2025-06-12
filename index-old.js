const express = require('express');
const bodypaser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const fs = require("fs");
const YAML = require('yaml');
const file  = fs.readFileSync('./swagger.yaml', 'utf8');
const swaggerDocument = YAML.parse(file);
const app = express();
const cors = require('cors');

app.use(bodyparser.json())
app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const port = 8000

let caselist = [{token:"testtoken",case_id:1,case_status:"Opened"}]
let token = []
let case_id = []
let case_status = ["Opened", "Closed"]
let case_result = ["WaitingAnalysis", "TruePosotives" ,"FalsePosotives"]

app.get('/updatecasestatus', (req, res) => {
    res.json(caselist);
})

app.get('/updatecasestatus/:id', (req, res) => {
    let case_id = req.params.id
    let caseid = caselist.find(caseid => caseid.id === case_id);
    if(caseid){
        res.json(caselist);
    }else {
        res.status(404).send('case not found');
    }
})

app.post('/updatecasestatus', (req,res) => {
    let newcase = req.body;
    newcase.id = caselist.length + 1;
    caselist.push(newcase);
    res.status(201).json(newcase);
})

app.put('/updatecasestatus/:id', (req,res) => {
    let case_id = req.params.id
    let updatecase = req.bode;
    let caseindex = caselist.findIndex(caseid => caseid.id === case_id);
    if(caseindex !== -1){
        caselist[caseindex] = {...caselist[caseindex], ...updatecase, id: caseid};
        res.json(caselist[caseindex]);
    }else{
        res.status(404).send('case not found');
    }
})

app.delete('/updatecasestatus/:id', (req,res) => {
    let case_id = req.params.id
    caselist = caselist.filter(caseid => caseid.id !== case_id);
    res.status(204).send();
})

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})