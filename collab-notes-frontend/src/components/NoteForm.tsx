import { useState, useEffect } from 'react';
import { useCreateNote } from '../features/notes/useCreateNote';
import { gql, useQuery, useApolloClient } from '@apollo/client';

const GET_USERS = gql`
  query GetUsers {
    users {
      id
      email
    }
  }
`;

const GET_NOTES = gql`
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

const NoteForm = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [userId, setUserId] = useState(() => localStorage.getItem('userId') || '');
  const { data: userData } = useQuery(GET_USERS);
  const [createNote, { loading, error }] = useCreateNote();
  const client = useApolloClient();

  useEffect(() => {
    if (userId) localStorage.setItem('userId', userId);
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !userId) return;

    await createNote({ variables: { title, content, userId } });

    setTitle('');
    setContent('');

    await client.refetchQueries({ include: [GET_NOTES] });
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      <h2>Create Note</h2>
      <select
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem' }}
      >
        <option value="">Select User</option>
        {userData?.users?.map((user: any) => (
          <option key={user.id} value={user.id}>
            {user.email}
          </option>
        ))}
      </select>
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem' }}
      />
      <textarea
        placeholder="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem' }}
      />
      <button type="submit" disabled={loading || !title || !content || !userId}>
        {loading ? 'Creating...' : 'Create Note'}
      </button>
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
    </form>
  );
};

export default NoteForm;
