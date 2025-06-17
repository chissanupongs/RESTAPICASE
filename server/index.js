// server/index.js
import express from "express";
import cors from "cors";
import fs from "fs";
import YAML from "yaml";
import swaggerUi from "swagger-ui-express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import path from "path";

const HISTORY_FILE_PATH = path.resolve("../data/history.json");

// --- โหลด Swagger ---
const swaggerFile = fs.readFileSync("./swagger.yaml", "utf8");
const swaggerDocument = YAML.parse(swaggerFile);

// --- เตรียม GraphQL Schema & Resolvers (ย้ายจาก project ของ Apollo) ---
const typeDefs = /* GraphQL */ `
  type Case {
    token: String
    case_id: [String]
    case_status: String
    case_result: String
    timestamp: String
    locked: Boolean
  }

  type HistoryEntry {
    timestamp: String
    action: String
    case: Case
  }

  type Query {
    caselist: [Case]
    history: [HistoryEntry]
  }

  type Mutation {
    updateCaseStatus(
      token: String!
      case_id: [String!]!
      case_status: String!
    ): [Case]
    updateCaseResult(
      token: String!
      case_id: [String!]!
      case_result: String!
    ): [Case]
    addCase(token: String!, case_id: [String!]!): [Case]
    deleteCase(token: String!, case_id: [String!]!): [Case]
    lockCase(token: String!, case_id: [String!]!): [Case]
    unlockCase(token: String!, case_id: [String!]!): [Case]
  }
`;

const VALID_STATUSES = ["Opened", "Closed"];
const VALID_RESULTS = ["WaitingAnalysis", "TruePositives", "FalsePositives"];

let caselist = [];

function appendHistory(action, cases) {
  try {
    const now = new Date().toISOString();
    let historyData = [];

    if (fs.existsSync(HISTORY_FILE_PATH)) {
      const fileContent = fs.readFileSync(HISTORY_FILE_PATH, "utf-8");
      historyData = fileContent ? JSON.parse(fileContent) : [];
    }

    cases.forEach((c) => {
      historyData.push({
        timestamp: now,
        action,
        case: c,
      });
    });

    fs.writeFileSync(
      HISTORY_FILE_PATH,
      JSON.stringify(historyData, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.error("Error writing history file:", err);
  }
}

const resolvers = {
  Query: {
    caselist: () => caselist,

    history: () => {
      try {
        if (fs.existsSync(HISTORY_FILE_PATH)) {
          const fileContent = fs.readFileSync(HISTORY_FILE_PATH, "utf-8");
          return fileContent ? JSON.parse(fileContent) : [];
        }
        return [];
      } catch (err) {
        console.error("Error reading history file:", err);
        return [];
      }
    },
  },

  Mutation: {
    updateCaseStatus: (_, { token, case_id, case_status }) => {
      if (!VALID_STATUSES.includes(case_status)) {
        throw new Error(
          `Invalid 'case_status'. Allowed values: ${VALID_STATUSES.join(", ")}`
        );
      }

      let updatedCases = [];

      case_id.forEach((singleCaseId) => {
        const index = caselist.findIndex(
          (item) => item.token === token && item.case_id.includes(singleCaseId)
        );

        if (index !== -1) {
          caselist[index].case_status = case_status;
          caselist[index].timestamp = new Date().toISOString();
          if (!caselist[index].case_id.includes(singleCaseId)) {
            caselist[index].case_id.push(singleCaseId);
          }
          updatedCases.push(caselist[index]);
        } else {
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
      });

      appendHistory("updateCaseStatus", updatedCases);

      return updatedCases;
    },

    updateCaseResult: (_, { token, case_id, case_result }) => {
      if (!VALID_RESULTS.includes(case_result)) {
        throw new Error(
          `Invalid 'case_result'. Allowed values: ${VALID_RESULTS.join(", ")}`
        );
      }

      let updatedCases = [];

      case_id.forEach((singleCaseId) => {
        const index = caselist.findIndex(
          (item) => item.token === token && item.case_id.includes(singleCaseId)
        );

        if (index !== -1) {
          caselist[index].case_result = case_result;
          caselist[index].timestamp = new Date().toISOString();
          if (!caselist[index].case_id.includes(singleCaseId)) {
            caselist[index].case_id.push(singleCaseId);
          }
          updatedCases.push(caselist[index]);
        } else {
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
      });

      appendHistory("updateCaseResult", updatedCases);

      return updatedCases;
    },

    addCase: (_, { token, case_id }) => {
      let addedCases = [];

      case_id.forEach((singleCaseId) => {
        const exists = caselist.some(
          (item) => item.token === token && item.case_id.includes(singleCaseId)
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

      return addedCases;
    },

    deleteCase: (_, { token, case_id }) => {
      let deletedCases = [];

      case_id.forEach((singleCaseId) => {
        const index = caselist.findIndex(
          (item) => item.token === token && item.case_id.includes(singleCaseId)
        );

        if (index !== -1) {
          if (caselist[index].locked) {
            // ป้องกันการลบเคสที่ถูกล็อก
            throw new Error(`Cannot delete locked case: ${singleCaseId}`);
          }

          const [deleted] = caselist.splice(index, 1);
          deletedCases.push(deleted);
        }
      });

      if (deletedCases.length === 0) {
        throw new Error("No matching cases found to delete.");
      }

      appendHistory("deleteCase", deletedCases);

      return deletedCases;
    },

    lockCase: (_, { token, case_id }) => {
      let updatedCases = [];

      case_id.forEach((singleCaseId) => {
        const index = caselist.findIndex(
          (item) => item.token === token && item.case_id.includes(singleCaseId)
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

      return updatedCases;
    },

    unlockCase: (_, { token, case_id }) => {
      let updatedCases = [];

      case_id.forEach((singleCaseId) => {
        const index = caselist.findIndex(
          (item) => item.token === token && item.case_id.includes(singleCaseId)
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

      return updatedCases;
    },
  },
};

const app = express();
app.use(cors());
app.use(express.json());

// ดึงรายชื่อเคสทั้งหมด
app.get("/caselist", (req, res) => {
  res.json(caselist);
});

// ดึงประวัติทั้งหมด
app.get("/history", (req, res) => {
  try {
    if (fs.existsSync(HISTORY_FILE_PATH)) {
      const fileContent = fs.readFileSync(HISTORY_FILE_PATH, "utf-8");
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
app.post("/addCase", (req, res) => {
  const { token, case_id } = req.body;

  if (!token || !Array.isArray(case_id)) {
    return res.status(400).json({ error: "token and case_id array required" });
  }

  let addedCases = [];

  case_id.forEach((singleCaseId) => {
    const exists = caselist.some(
      (item) => item.token === token && item.case_id.includes(singleCaseId)
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
app.put("/updateCaseStatus", (req, res) => {
  const { token, case_id, case_status } = req.body;

  if (!token || !Array.isArray(case_id) || !case_status) {
    return res
      .status(400)
      .json({ error: "token, case_id array and case_status required" });
  }

  if (!VALID_STATUSES.includes(case_status)) {
    return res
      .status(400)
      .json({
        error: `Invalid 'case_status'. Allowed: ${VALID_STATUSES.join(", ")}`,
      });
  }

  let updatedCases = [];

  for (const singleCaseId of case_id) {
    const index = caselist.findIndex(
      (item) => item.token === token && item.case_id.includes(singleCaseId)
    );

    if (index !== -1) {
      if (caselist[index].locked) {
        return res
          .status(403)
          .json({
            error: `Cannot update status of locked case: ${singleCaseId}`,
          });
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
app.put("/updateCaseResult", (req, res) => {
  const { token, case_id, case_result } = req.body;

  if (!token || !Array.isArray(case_id) || !case_result) {
    return res
      .status(400)
      .json({ error: "token, case_id array and case_result required" });
  }

  if (!VALID_RESULTS.includes(case_result)) {
    return res
      .status(400)
      .json({
        error: `Invalid 'case_result'. Allowed: ${VALID_RESULTS.join(", ")}`,
      });
  }

  let updatedCases = [];

  for (const singleCaseId of case_id) {
    const index = caselist.findIndex(
      (item) => item.token === token && item.case_id.includes(singleCaseId)
    );

    if (index !== -1) {
      if (caselist[index].locked) {
        return res
          .status(403)
          .json({
            error: `Cannot update result of locked case: ${singleCaseId}`,
          });
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
app.delete("/deleteCase", (req, res) => {
  const { token, case_id } = req.body;

  if (!token || !Array.isArray(case_id)) {
    return res.status(400).json({ error: "token and case_id array required" });
  }

  let deletedCases = [];

  for (const singleCaseId of case_id) {
    const index = caselist.findIndex(
      (item) => item.token === token && item.case_id.includes(singleCaseId)
    );

    if (index !== -1) {
      if (caselist[index].locked) {
        return res
          .status(403)
          .json({ error: `Cannot delete locked case: ${singleCaseId}` });
      }
      const [deleted] = caselist.splice(index, 1);
      deletedCases.push(deleted);
    }
  }

  if (deletedCases.length === 0) {
    return res
      .status(404)
      .json({ error: "No matching cases found to delete." });
  }

  appendHistory("deleteCase", deletedCases);
  res.json(deletedCases);
});

// ล็อคเคส
app.put("/lockCase", (req, res) => {
  const { token, case_id } = req.body;

  if (!token || !Array.isArray(case_id)) {
    return res.status(400).json({ error: "token and case_id array required" });
  }

  let updatedCases = [];

  case_id.forEach((singleCaseId) => {
    const index = caselist.findIndex(
      (item) => item.token === token && item.case_id.includes(singleCaseId)
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
app.put("/unlockCase", (req, res) => {
  const { token, case_id } = req.body;

  if (!token || !Array.isArray(case_id)) {
    return res.status(400).json({ error: "token and case_id array required" });
  }

  let updatedCases = [];

  case_id.forEach((singleCaseId) => {
    const index = caselist.findIndex(
      (item) => item.token === token && item.case_id.includes(singleCaseId)
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

try {
  fs.writeFileSync(HISTORY_FILE_PATH, "[]", "utf-8");
  console.log("✅ Cleared history.json on startup");
} catch (err) {
  console.error("❌ Failed to clear history.json:", err);
}

// เริ่ม Apollo Server แบบ middleware
const apollo = new ApolloServer({ typeDefs, resolvers });
await apollo.start();

// ใส่ REST endpoint จาก Express (copy จากไฟล์ index ที่มีอยู่)
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from REST" });
});

// เสิร์ฟ Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// เสิร์ฟ GraphQL ผ่าน Apollo middleware
app.use("/graphql", expressMiddleware(apollo));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`✅ REST & Swagger at http://localhost:${PORT}/api-docs`);
  console.log(`🚀 GraphQL at http://localhost:${PORT}/graphql`);
});
