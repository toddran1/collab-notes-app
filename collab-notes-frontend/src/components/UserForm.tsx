import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';

const CREATE_USER = gql`
  mutation CreateUser($email: String!, $name: String) {
    createUser(email: $email, name: $name) {
      id
      email
    }
  }
`;

const GET_USERS = gql`
  query GetUsers {
    users {
      id
      email
    }
  }
`;

const UserForm = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [createUser, { loading, error }] = useMutation(CREATE_USER, {
    refetchQueries: [{ query: GET_USERS }],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await createUser({ variables: { email, name } });
    setEmail('');
    setName('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      <h2>Create User</h2>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem' }}
      />
      <input
        placeholder="Name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem' }}
      />
      <button type="submit" disabled={loading || !email}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
    </form>
  );
};

export default UserForm;
