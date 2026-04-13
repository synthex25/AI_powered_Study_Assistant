import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ClassState {
  department: string | null;
  batchYear: string | null;
}

const initialState: ClassState = {
  department: null,
  batchYear: null,
};

const classSlice = createSlice({
  name: 'classinfo',
  initialState,
  reducers: {
    setDepartmentState: (state, action: PayloadAction<{ department: string }>) => {
      state.department = action.payload.department;
    },
    setBatchYearState: (state, action: PayloadAction<{ batchYear: string }>) => {
      state.batchYear = action.payload.batchYear;
    },
    clearClassInfo: (state) => {
      state.department = null;
      state.batchYear = null;
    },
  },
});

export const { setDepartmentState, setBatchYearState, clearClassInfo } = classSlice.actions;

export default classSlice.reducer;
