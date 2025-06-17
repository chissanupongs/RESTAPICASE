import express from 'express';
import fs from 'fs';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';
import path from 'path';

// โหลด Swagger YAML
const file = fs.readFileSync('./swagger.yaml', 'utf8');
const swaggerDocument = yaml.parse(file);

// path ไฟล์ history
const HISTORY_FILE_PATH = path.resolve('../data/history.json');

const VALID_STATUSES = ["Opened", "Closed"];
const VALID_RESULTS = ["WaitingAnalysis", "TruePositives", "FalsePositives"];

let caselist = [];

// เคลียร์ไฟล์ history ตอนเริ่มต้น
try {
  fs.writeFileSync(HISTORY_FILE_PATH, '[]', 'utf-8');
  console.log("✅ Cleared history.json on startup");
} catch (err) {
  console.error("❌ Failed to clear history.json:", err);
}

function appendHistory(action, cases) {
  try {
    const now = new Date().toISOString();
    let historyData = [];

    if (fs.existsSync(HISTORY_FILE_PATH)) {
      const fileContent = fs.readFileSync(HISTORY_FILE_PATH, 'utf-8');
      historyData = fileContent ? JSON.parse(fileContent) : [];
    }

    cases.forEach(c => {
      historyData.push({
        timestamp: now,
        action,
        case: c,
      });
    });

    fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify(historyData, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing history file:", err);
  }
}

const app = express();

app.use(cors());
app.use(express.json());

// REST API Endpoints

// ดึงรายชื่อเคสทั้งหมด
app.get('/caselist', (req, res) => {
  res.json(caselist);
});

// ดึงประวัติทั้งหมด
app.get('/history', (req, res) => {
  try {
    if (fs.existsSync(HISTORY_FILE_PATH)) {
      const fileContent = fs.readFileSync(HISTORY_FILE_PATH, 'utf-8');
      res.json(fileContent ? JSON.parse(fileContent) : []);
    } else {
      res.json([]);
    }
  } catch (err) {
    console.error("Error reading history file:", err);
    res.status(500).json({ error: "Failed to read history file" });
  }
});

// เพิ่มเคส
app.post('/addCase', (req, res) => {
  const { token, case_id } = req.body;

  if (!token || !Array.isArray(case_id)) {
    return res.status(400).json({ error: "token and case_id array required" });
  }

  let addedCases = [];

  case_id.forEach(singleCaseId => {
    const exists = caselist.some(
      item => item.token === token && item.case_id.includes(singleCaseId)
    );
    if (!exists) {
      const newCase = {
        token,
        case_id: [singleCaseId],
        case_status: null,
        case_result: null,
        timestamp: new Date().toISOString(),
        locked: false,
      };
      caselist.push(newCase);
      addedCases.push(newCase);
    }
  });

  if (addedCases.length > 0) {
    appendHistory("addCase", addedCases);
  }

  res.json(addedCases);
});

// อัพเดต case_status
app.put('/updateCaseStatus', (req, res) => {
  const { token, case_id, case_status } = req.body;

  if (!token || !Array.isArray(case_id) || !case_status) {
    return res.status(400).json({ error: "token, case_id array and case_status required" });
  }

  if (!VALID_STATUSES.includes(case_status)) {
    return res.status(400).json({ error: `Invalid 'case_status'. Allowed: ${VALID_STATUSES.join(", ")}` });
  }

  let updatedCases = [];

  for (const singleCaseId of case_id) {
    const index = caselist.findIndex(
      item => item.token === token && item.case_id.includes(singleCaseId)
    );

    if (index !== -1) {
      if (caselist[index].locked) {
        return res.status(403).json({ error: `Cannot update status of locked case: ${singleCaseId}` });
      }
      caselist[index].case_status = case_status;
      caselist[index].timestamp = new Date().toISOString();
      if (!caselist[index].case_id.includes(singleCaseId)) {
        caselist[index].case_id.push(singleCaseId);
      }
      updatedCases.push(caselist[index]);
    } else {
      // สร้างเคสใหม่ได้เลย (ล็อก = false)
      const newCase = {
        token,
        case_id: [singleCaseId],
        case_status,
        case_result: null,
        timestamp: new Date().toISOString(),
        locked: false,
      };
      caselist.push(newCase);
      updatedCases.push(newCase);
    }
  }

  appendHistory("updateCaseStatus", updatedCases);
  res.json(updatedCases);
});

// อัพเดต case_result
app.put('/updateCaseResult', (req, res) => {
  const { token, case_id, case_result } = req.body;

  if (!token || !Array.isArray(case_id) || !case_result) {
    return res.status(400).json({ error: "token, case_id array and case_result required" });
  }

  if (!VALID_RESULTS.includes(case_result)) {
    return res.status(400).json({ error: `Invalid 'case_result'. Allowed: ${VALID_RESULTS.join(", ")}` });
  }

  let updatedCases = [];

  for (const singleCaseId of case_id) {
    const index = caselist.findIndex(
      item => item.token === token && item.case_id.includes(singleCaseId)
    );

    if (index !== -1) {
      if (caselist[index].locked) {
        return res.status(403).json({ error: `Cannot update result of locked case: ${singleCaseId}` });
      }
      caselist[index].case_result = case_result;
      caselist[index].timestamp = new Date().toISOString();
      if (!caselist[index].case_id.includes(singleCaseId)) {
        caselist[index].case_id.push(singleCaseId);
      }
      updatedCases.push(caselist[index]);
    } else {
      // สร้างเคสใหม่ได้เลย (ล็อก = false)
      const newCase = {
        token,
        case_id: [singleCaseId],
        case_status: null,
        case_result,
        timestamp: new Date().toISOString(),
        locked: false,
      };
      caselist.push(newCase);
      updatedCases.push(newCase);
    }
  }

  appendHistory("updateCaseResult", updatedCases);
  res.json(updatedCases);
});

// ลบเคส
app.delete('/deleteCase', (req, res) => {
  const { token, case_id } = req.body;

  if (!token || !Array.isArray(case_id)) {
    return res.status(400).json({ error: "token and case_id array required" });
  }

  let deletedCases = [];

  for (const singleCaseId of case_id) {
    const index = caselist.findIndex(
      item => item.token === token && item.case_id.includes(singleCaseId)
    );

    if (index !== -1) {
      if (caselist[index].locked) {
        return res.status(403).json({ error: `Cannot delete locked case: ${singleCaseId}` });
      }
      const [deleted] = caselist.splice(index, 1);
      deletedCases.push(deleted);
    }
  }

  if (deletedCases.length === 0) {
    return res.status(404).json({ error: "No matching cases found to delete." });
  }

  appendHistory("deleteCase", deletedCases);
  res.json(deletedCases);
});

// ล็อคเคส
app.put('/lockCase', (req, res) => {
  const { token, case_id } = req.body;

  if (!token || !Array.isArray(case_id)) {
    return res.status(400).json({ error: "token and case_id array required" });
  }

  let updatedCases = [];

  case_id.forEach(singleCaseId => {
    const index = caselist.findIndex(
      item => item.token === token && item.case_id.includes(singleCaseId)
    );

    if (index !== -1) {
      caselist[index].locked = true;
      caselist[index].timestamp = new Date().toISOString();
      updatedCases.push(caselist[index]);
    } else {
      const newCase = {
        token,
        case_id: [singleCaseId],
        case_status: null,
        case_result: null,
        timestamp: new Date().toISOString(),
        locked: true,
      };
      caselist.push(newCase);
      updatedCases.push(newCase);
    }
  });

  appendHistory("lockCase", updatedCases);
  res.json(updatedCases);
});

// ปลดล็อคเคส
app.put('/unlockCase', (req, res) => {
  const { token, case_id } = req.body;

  if (!token || !Array.isArray(case_id)) {
    return res.status(400).json({ error: "token and case_id array required" });
  }

  let updatedCases = [];

  case_id.forEach(singleCaseId => {
    const index = caselist.findIndex(
      item => item.token === token && item.case_id.includes(singleCaseId)
    );

    if (index !== -1) {
      caselist[index].locked = false;
      caselist[index].timestamp = new Date().toISOString();
      updatedCases.push(caselist[index]);
    } else {
      const newCase = {
        token,
        case_id: [singleCaseId],
        case_status: null,
        case_result: null,
        timestamp: new Date().toISOString(),
        locked: false,
      };
      caselist.push(newCase);
      updatedCases.push(newCase);
    }
  });

  appendHistory("unlockCase", updatedCases);
  res.json(updatedCases);
});

// Swagger UI
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 REST API server running at http://localhost:${PORT}`);
  console.log(`📘 Swagger UI available at http://localhost:${PORT}/swagger`);
});
