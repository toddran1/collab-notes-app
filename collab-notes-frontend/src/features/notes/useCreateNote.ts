import { gql, useMutation } from '@apollo/client';

export const CREATE_NOTE = gql`
  mutation CreateNote($title: String!, $content: String!, $userId: String!) {
    createNote(title: $title, content: $content, userId: $userId) {
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

export const useCreateNote = () => {
  return useMutation(CREATE_NOTE);
};
