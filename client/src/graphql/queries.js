import { gql } from '@apollo/client';

export const GET_CASELIST = gql`
  query {
    caselist {
      token
      case_id
      case_status
      case_result
      locked
      timestamp
    }
  }
`;

export const GET_HISTORY = gql`
  query GetHistory {
    history {
      timestamp
      action
      case {
        token
        case_id
        case_status
        case_result
        locked
        timestamp
      }
    }
  }
`;
