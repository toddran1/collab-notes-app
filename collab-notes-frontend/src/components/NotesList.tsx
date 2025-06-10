import { useNotes } from '../features/notes/useNotes';

const NotesList = () => {
  const { data, loading, error } = useNotes();

  if (loading) return <p>Loading notes...</p>;
  if (error) return <p>Error loading notes: {error.message}</p>;

  return (
    <div>
      <h2>Notes</h2>
      {data?.notes?.length === 0 && <p>No notes found.</p>}
      <ul>
        {data?.notes?.map((note: any) => (
          <li key={note.id}>
            <h3>{note.title}</h3>
            <p>{note.content}</p>
            <small>By: {note.user.email}</small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotesList;
