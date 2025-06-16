import { gql } from '@apollo/client';

export const GET_CASELIST = gql`
  query GetCaseList {
    caselist {
      token
      case_id
      case_status
      case_result
      timestamp
    }
  }
`;
