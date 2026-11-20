import { createSlice, nanoid } from '@reduxjs/toolkit';

const initialState = { toasts: [] };

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    pushToast: {
      reducer(state, action) { state.toasts.push(action.payload); },
      prepare(message, type = 'success') { return { payload: { id: nanoid(), message, type } }; },
    },
    removeToast(state, action) { state.toasts = state.toasts.filter((t) => t.id !== action.payload); },
  },
});

export const { pushToast, removeToast } = toastSlice.actions;
export default toastSlice.reducer;
