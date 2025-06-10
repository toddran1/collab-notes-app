import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface Note {
  id: string;
  title: string;
  content: string;
  user: {
    id: string;
    email: string;
  };
}

interface NotesState {
  items: Note[];
}

const initialState: NotesState = {
  items: [],
};

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    setNotes(state, action: PayloadAction<Note[]>) {
      state.items = action.payload;
    },
    addNote(state, action: PayloadAction<Note>) {
      state.items.push(action.payload);
    },
  },
});

export const { setNotes, addNote } = notesSlice.actions;
export default notesSlice.reducer;
