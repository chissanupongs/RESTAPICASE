import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const typeDefs = `#graphql

  type Case {
    token: String
    case_id: [String]
    case_status: String
    case_result: String
    timestamp: String
  }

  type Query {
    caselist: [Case]
  }

  type Mutation {
    updateCaseStatus(token: String!, case_id: [String!]!, case_status: String!): [Case]
    updateCaseResult(token: String!, case_id: [String!]!, case_result: String!): [Case]
    addCase(token: String!, case_id: [String!]!): [Case]
    deleteCase(token: String!, case_id: [String!]!): [Case]
  }
`;

const VALID_STATUSES = ["Opened", "Closed"];
const VALID_RESULTS = ["WaitingAnalysis", "TruePositives", "FalsePositives"];

let caselist = [];

const resolvers = {
  Query: {
    caselist: () => caselist,
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
          caselist[index].timestamp = new Date().toISOString(); // เพิ่ม timestamp
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
            timestamp: new Date().toISOString(), // เพิ่ม timestamp
          };
          caselist.push(newCase);
          updatedCases.push(newCase);
        }
      });

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
          caselist[index].timestamp = new Date().toISOString(); // เพิ่ม timestamp
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
            timestamp: new Date().toISOString(), // เพิ่ม timestamp
          };
          caselist.push(newCase);
          updatedCases.push(newCase);
        }
      });

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
            timestamp: new Date().toISOString(), // เพิ่ม timestamp
          };
          caselist.push(newCase);
          addedCases.push(newCase);
        }
      });

      return addedCases;
    },

    deleteCase: (_, { token, case_id }) => {
      let deletedCases = [];

      case_id.forEach(singleCaseId => {
        const index = caselist.findIndex(
          item => item.token === token && item.case_id.includes(singleCaseId)
        );

        if (index !== -1) {
          const [deleted] = caselist.splice(index, 1);
          deletedCases.push(deleted);
        }
      });

      if (deletedCases.length === 0) {
        throw new Error("No matching cases found to delete.");
      }

      return deletedCases;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀  Server ready at: ${url}`);
