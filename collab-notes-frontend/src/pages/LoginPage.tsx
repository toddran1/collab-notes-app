import { gql, useMutation } from '@apollo/client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        name
      }
    }
  }
`;

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [login, { loading, error }] = useMutation(LOGIN);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await login({ variables: form });
    localStorage.setItem('token', data.login.token);
    navigate('/');
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      <input name="email" placeholder="Email" onChange={handleChange} />
      <input name="password" type="password" placeholder="Password" onChange={handleChange} />
      <button type="submit" disabled={loading}>Login</button>
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
    </form>
  );
}