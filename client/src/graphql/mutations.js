import { gql } from '@apollo/client';

export const UPDATE_CASE_STATUS = gql`
  mutation UpdateCaseStatus($token: String!, $case_id: [String!]!, $case_status: String!) {
    updateCaseStatus(token: $token, case_id: $case_id, case_status: $case_status) {
      token
      case_id
      case_status
      case_result
    }
  }
`;

export const UPDATE_CASE_RESULT = gql`
  mutation UpdateCaseResult($token: String!, $case_id: [String!]!, $case_result: String!) {
    updateCaseResult(token: $token, case_id: $case_id, case_result: $case_result) {
      token
      case_id
      case_status
      case_result
    }
  }
`;

export const ADD_CASE = gql`
  mutation AddCase($token: String!, $case_id: [String!]!) {
    addCase(token: $token, case_id: $case_id) {
      token
      case_id
      case_status
      case_result
    }
  }
`;

export const DELETE_CASE = gql`
  mutation DeleteCase($token: String!, $case_id: [String!]!) {
    deleteCase(token: $token, case_id: $case_id) {
      token
      case_id
      case_status
      case_result
    }
  }
`;
