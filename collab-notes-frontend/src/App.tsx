import { useState } from 'react';
import NotesList from './components/NotesList';
import NoteForm from './components/NoteForm';
import UserForm from './components/UserForm';

function App() {
  const [tab, setTab] = useState<'create-note' | 'create-user'>('create-note');

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1 style={{ textAlign: 'center' }}>Collaborative Notes App</h1>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setTab('create-note')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: tab === 'create-note' ? '#007bff' : '#ccc',
            color: tab === 'create-note' ? '#fff' : '#000',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Create Note
        </button>
        <button
          onClick={() => setTab('create-user')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: tab === 'create-user' ? '#007bff' : '#ccc',
            color: tab === 'create-user' ? '#fff' : '#000',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Create User
        </button>
      </div>

      {tab === 'create-note' ? <NoteForm /> : <UserForm />}
      <NotesList />
    </div>
  );
}

export default App;
