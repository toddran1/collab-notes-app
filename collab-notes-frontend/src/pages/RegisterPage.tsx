import { gql, useMutation } from '@apollo/client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        email
        name
      }
    }
  }
`;

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [register, { loading, error }] = useMutation(REGISTER);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await register({ variables: { input: form } });
    localStorage.setItem('token', data.register.token);
    navigate('/');
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>
      <input name="email" placeholder="Email" onChange={handleChange} />
      <input name="name" placeholder="Name" onChange={handleChange} />
      <input name="password" type="password" placeholder="Password" onChange={handleChange} />
      <button type="submit" disabled={loading}>Register</button>
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
    </form>
  );
}