import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import fs from 'fs';
import path from 'path';

const HISTORY_FILE_PATH = `C:\\Users\\chissanupong.s\\Desktop\\gong\\RESTAPICASE\\data\\history.json`;

const typeDefs = `#graphql

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
    updateCaseStatus(token: String!, case_id: [String!]!, case_status: String!): [Case]
    updateCaseResult(token: String!, case_id: [String!]!, case_result: String!): [Case]
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

const resolvers = {
  Query: {
    caselist: () => caselist,

    history: () => {
      try {
        if (fs.existsSync(HISTORY_FILE_PATH)) {
          const fileContent = fs.readFileSync(HISTORY_FILE_PATH, 'utf-8');
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
        throw new Error(`Invalid 'case_status'. Allowed values: ${VALID_STATUSES.join(", ")}`);
      }

      let updatedCases = [];

      case_id.forEach(singleCaseId => {
        const index = caselist.findIndex(
          item => item.token === token && item.case_id.includes(singleCaseId)
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
        throw new Error(`Invalid 'case_result'. Allowed values: ${VALID_RESULTS.join(", ")}`);
      }

      let updatedCases = [];

      case_id.forEach(singleCaseId => {
        const index = caselist.findIndex(
          item => item.token === token && item.case_id.includes(singleCaseId)
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

      return addedCases;
    },

    deleteCase: (_, { token, case_id }) => {
      let deletedCases = [];

      case_id.forEach(singleCaseId => {
        const index = caselist.findIndex(
          item => item.token === token && item.case_id.includes(singleCaseId)
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

    return updatedCases;
  },

  unlockCase: (_, { token, case_id }) => {
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

    return updatedCases;
  },
  },
};

// Clear history file on server start
try {
  fs.writeFileSync(HISTORY_FILE_PATH, '[]', 'utf-8');
  console.log("✅ Cleared history.json on startup");
} catch (err) {
  console.error("❌ Failed to clear history.json:", err);
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀  Server ready at: ${url}`);
