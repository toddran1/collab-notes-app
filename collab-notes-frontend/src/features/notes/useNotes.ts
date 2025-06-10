import { gql, useQuery } from '@apollo/client';

export const GET_NOTES = gql`
  query GetNotes {
    notes {
      id
      title
      content
      user {
        id
        email
      }
    }
  }
`;

export const useNotes = () => {
  return useQuery(GET_NOTES);
};
